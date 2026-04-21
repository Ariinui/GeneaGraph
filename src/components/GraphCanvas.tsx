import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { Plus, Link2, GitMerge, ArrowDown, ArrowUp, ArrowRight, ArrowLeft, Download, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import type { Relation, LayoutDirection, HierarchyFocus } from '@/types/genealogy';

// ── helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function getRelationColor(type: string): string {
  switch (type) {
    case 'parent':    return '#4a9eff';
    case 'alliance':  return '#c9a84c';
    case 'adoption':  return '#f97316';
    case 'tutelle':   return '#06b6d4';
    case 'witness':   return '#8b5cf6';
    case 'godparent': return '#10b981';
    default:          return '#8a8894';
  }
}


function isEdgeOnPath(edge: Relation, path: string[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)) return true;
  }
  return false;
}

const positionsKey = (mode: string) => `geneagraph:positions:${mode}:v3`;

// ── Global position cache that persists across network recreations ─────────────
const globalPositionsCache = new Map<string, Record<string, { x: number; y: number }>>();

// ── component ─────────────────────────────────────────────────────────────────

export default function GraphCanvas() {
  const containerRef       = useRef<HTMLDivElement>(null);
  const networkRef         = useRef<Network | null>(null);
  const nodesRef           = useRef<DataSet<any> | null>(null);
  const edgesRef           = useRef<DataSet<any> | null>(null);
  const quickAddTriggerRef = useRef<(() => void) | null>(null);
  const dimmedRef          = useRef<Set<string>>(new Set());
  const highlightedPathRef = useRef<string[] | null>(null);
  const pathModeRef        = useRef(false);
  const lastLayoutModeRef  = useRef<string>('physics');

  const {
    persons, relations, branches,
    selectedPersonId, setSelectedPersonId,
    layoutMode, setLayoutMode,
    layoutDirection, setLayoutDirection,
    hierarchyFocus, setHierarchyFocus,
    hierarchyRootId, setHierarchyRootId,
    generationDepth,
    activeFilters, activeBranchFilters,
    setHoveredPersonId,
    highlightedPath, setHighlightedPath,
    addPerson,
    setPanelOpen,
    yearRange,
    showPivots, toggleShowPivots,
    betweennessMap,
    getShortestPath,
    getAncestors,
    getDescendants,
  } = useApp();

  const [pathMode, setPathMode] = useState(false);
  const [pathNodeA, setPathNodeA] = useState<string | null>(null);
  const pathNodeARef = useRef<string | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({ firstName: '', lastName: '', gender: 'M' as 'M' | 'F' });

  quickAddTriggerRef.current = () => {
    setQuickForm({ firstName: '', lastName: '', gender: 'M' });
    setQuickAddOpen(true);
  };

  const branchColorMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => map.set(b.id, b.color));
    return map;
  }, [branches]);

  const filteredRelations = useMemo(() => relations.filter(r => {
    if (!activeFilters.includes(r.type)) return false;
    const from = persons.find(p => p.id === r.from);
    const to   = persons.find(p => p.id === r.to);
    if (!from || !to) return false;
    if (from.branch && !activeBranchFilters.includes(from.branch)) return false;
    if (to.branch   && !activeBranchFilters.includes(to.branch))   return false;
    return true;
  }), [relations, persons, activeFilters, activeBranchFilters]);

  const visiblePersons = useMemo(() => {
    let ids = new Set<string>();
    
    if (layoutMode === 'hierarchical' && hierarchyRootId && hierarchyFocus !== 'all') {
      if (hierarchyFocus === 'ancestors') {
        ids = new Set(getAncestors(hierarchyRootId, generationDepth));
      } else if (hierarchyFocus === 'descendants') {
        ids = new Set(getDescendants(hierarchyRootId, generationDepth));
      }
    } else {
      filteredRelations.forEach(r => { ids.add(r.from); ids.add(r.to); });
      persons.forEach(p => { if (!p.branch || activeBranchFilters.includes(p.branch)) ids.add(p.id); });
    }
    
    let result = persons.filter(p => ids.has(p.id));
    if (yearRange) {
      result = result.filter(p => {
        const y = p.birthDate ? parseInt(p.birthDate) : null;
        return y === null || (y >= yearRange[0] && y <= yearRange[1]);
      });
    }
    return result;
  }, [persons, filteredRelations, activeBranchFilters, yearRange, layoutMode, hierarchyRootId, hierarchyFocus, generationDepth, getAncestors, getDescendants]);

  const degreeMap = useMemo(() => {
    const map = new Map<string, number>();
    visiblePersons.forEach(p => map.set(p.id, 0));
    filteredRelations.forEach(r => {
      map.set(r.from, (map.get(r.from) || 0) + 1);
      map.set(r.to,   (map.get(r.to)   || 0) + 1);
    });
    return map;
  }, [visiblePersons, filteredRelations]);

  // ── sync path ref → redraw without recreating network ─────────────────────
  useEffect(() => {
    highlightedPathRef.current = highlightedPath;
    networkRef.current?.redraw();
  }, [highlightedPath]);

  useEffect(() => { pathModeRef.current = pathMode; }, [pathMode]);
  useEffect(() => { pathNodeARef.current = pathNodeA; networkRef.current?.redraw(); }, [pathNodeA]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const network = networkRef.current;
      if (!network) return;

      const scale = network.getScale();
      const pos = network.getViewPosition();
      const anim = { duration: 100, easingFunction: 'easeOutQuad' as const };

      switch (e.key) {
        case 'ArrowUp':
          network.moveTo({ position: { x: pos.x, y: pos.y - 50 / scale }, animation: anim });
          break;
        case 'ArrowDown':
          network.moveTo({ position: { x: pos.x, y: pos.y + 50 / scale }, animation: anim });
          break;
        case 'ArrowLeft':
          network.moveTo({ position: { x: pos.x - 50 / scale, y: pos.y }, animation: anim });
          break;
        case 'ArrowRight':
          network.moveTo({ position: { x: pos.x + 50 / scale, y: pos.y }, animation: anim });
          break;
        case '+':
        case '=':
          network.moveTo({ scale: scale * 1.2, animation: anim });
          break;
        case '-':
          network.moveTo({ scale: scale / 1.2, animation: anim });
          break;
        case 'f':
          network.fit({ animation: { duration: 300, easingFunction: 'easeOutQuad' } });
          break;
        case 'Escape':
          setSelectedPersonId(null);
          setPanelOpen(false);
          setHighlightedPath(null);
          setPathMode(false);
          setPathNodeA(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedPersonId, setPanelOpen, setHighlightedPath, setPathMode]);

  // ── selection: dim non-neighbors, no network recreation ───────────────────
  useEffect(() => {
    const network = networkRef.current;
    const edges   = edgesRef.current;
    if (!network || !edges) return;

    if (selectedPersonId) {
      const connected     = new Set(network.getConnectedNodes(selectedPersonId) as string[]);
      const connectedEdges = new Set(network.getConnectedEdges(selectedPersonId));
      dimmedRef.current   = new Set(visiblePersons.map(p => p.id).filter(id => id !== selectedPersonId && !connected.has(id)));

      edges.update(edges.getIds().map((id: any) => ({
        id,
        color: { opacity: connectedEdges.has(id) ? 0.9 : 0.08, color: getRelationColor(filteredRelations.find(r => r.id === id)?.type || '') },
      })));
    } else {
      dimmedRef.current = new Set();
      edges.update(filteredRelations.map(r => ({
        id: r.id,
        color: { opacity: 0.75, color: getRelationColor(r.type) },
      })));
    }
    network.redraw();
  }, [selectedPersonId, visiblePersons, filteredRelations]);

  // ── build & mount network ─────────────────────────────────────────────────
  const createNetwork = useCallback(() => {
    if (!containerRef.current) return;

    // ── restore saved positions from cache or localStorage ─────────────────────
    const cacheKey = positionsKey(layoutMode);
    let savedPositions: Record<string, { x: number; y: number }> = {};
    
    // First check in-memory cache (faster, survives network recreation)
    if (globalPositionsCache.has(cacheKey)) {
      savedPositions = globalPositionsCache.get(cacheKey)!;
    } else {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          savedPositions = JSON.parse(raw);
          globalPositionsCache.set(cacheKey, savedPositions);
        }
      } catch {}
    }
    
    const allHavePositions = layoutMode === 'physics' && visiblePersons.length > 0 && visiblePersons.every(p => savedPositions[p.id]);

    // ── shared canvas for font-size pre-computation ───────────────────────────
    const measureCtx = document.createElement('canvas').getContext('2d')!;

    // Node circle radius
    const CR = 48;

    // Hover card dimensions (larger for better readability)
    const HC_W = 280;
    const HC_H_BASE = 90;
    const HC_R = 12;

    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }

    const nodesData = visiblePersons.map(p => {
      const branchColor = p.branch ? (branchColorMap.get(p.branch) || '#5a7a9a') : '#5a7a9a';
      const genderColor = p.gender === 'M' ? '#4a9eff' : '#f472b6';
      const firstName   = p.firstName || '';
      const lastName    = p.lastName  || '';
      const lastNameUp  = lastName.toUpperCase();
      const [br, bg, bb] = hexToRgb(branchColor);

      // Pre-compute font sizes for inside circle
      const maxW = CR * 1.55;
      let firstFs = 13;
      measureCtx.font = `600 ${firstFs}px Outfit, -apple-system, sans-serif`;
      while (measureCtx.measureText(firstName).width > maxW && firstFs > 8) {
        firstFs--;
        measureCtx.font = `600 ${firstFs}px Outfit, -apple-system, sans-serif`;
      }
      let lastFs = 11;
      measureCtx.font = `700 ${lastFs}px Outfit, -apple-system, sans-serif`;
      while (measureCtx.measureText(lastNameUp).width > maxW && lastFs > 8) {
        lastFs--;
        measureCtx.font = `700 ${lastFs}px Outfit, -apple-system, sans-serif`;
      }

      const birthYear = p.birthDate ? p.birthDate.split('-')[0] : null;
      const deathYear = p.deathDate ? p.deathDate.split('-')[0] : null;
      const dateStr   = birthYear ? (deathYear ? `${birthYear} – ${deathYear}` : `∗ ${birthYear}`) : '';

      return {
        id: p.id,
        label: '',
        size: CR,
        x: savedPositions[p.id]?.x,
        y: savedPositions[p.id]?.y,
        shape: 'custom' as const,
        ctxRenderer: ({ ctx, x, y, state: { selected, hover } }: any) => ({
          drawNode() {
            const isDimmed = dimmedRef.current.has(p.id);
            const isOnPath = highlightedPathRef.current?.includes(p.id) || false;
            const showCard = (hover || selected) && !isDimmed;

            ctx.save();
            ctx.globalAlpha = isDimmed ? 0.15 : 1;

            // ── glow / shadow ─────────────────────────────────────────────────
            if (!isDimmed) {
              ctx.shadowColor  = selected ? 'rgba(201,168,76,0.75)' : isOnPath ? 'rgba(201,168,76,0.4)' : hover ? `rgba(${br},${bg},${bb},0.5)` : 'rgba(0,0,0,0.55)';
              ctx.shadowBlur   = selected ? 26 : isOnPath ? 16 : hover ? 20 : 10;
              ctx.shadowOffsetY = (selected || hover) ? 0 : 3;
            }

            // ── circle fill ───────────────────────────────────────────────────
            ctx.beginPath();
            ctx.arc(x, y, CR, 0, 2 * Math.PI);
            const grad = ctx.createRadialGradient(x - CR * 0.25, y - CR * 0.25, CR * 0.08, x, y, CR);
            grad.addColorStop(0, `rgba(${br},${bg},${bb},${selected ? 0.60 : hover ? 0.48 : 0.32})`);
            grad.addColorStop(1, `rgba(${br},${bg},${bb},${selected ? 0.30 : hover ? 0.22 : 0.12})`);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

            // ── circle border ─────────────────────────────────────────────────
            ctx.strokeStyle = selected ? '#c9a84c' : isOnPath ? '#e0c97f' : hover ? '#c9a84c' : genderColor;
            ctx.lineWidth   = selected || isOnPath ? 3 : hover ? 2.5 : 2;
            ctx.stroke();

            // ── gender dot (top-right) ────────────────────────────────────────
            const dotX = x + CR * 0.68;
            const dotY = y - CR * 0.68;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 6, 0, 2 * Math.PI);
            ctx.fillStyle = genderColor;
            ctx.globalAlpha = isDimmed ? 0.15 : 0.95;
            ctx.fill();
            ctx.globalAlpha = isDimmed ? 0.15 : 1;

            // ── pivot ring ────────────────────────────────────────────────────
            const pivotScore = betweennessMap.get(p.id) || 0;
            if (showPivots && pivotScore > 0.1) {
              ctx.beginPath();
              ctx.arc(x, y, CR + 6 + pivotScore * 6, 0, 2 * Math.PI);
              ctx.strokeStyle = `rgba(201,168,76,${0.3 + pivotScore * 0.6})`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 3]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // ── path-mode node A marker ───────────────────────────────────────
            if (pathNodeARef.current === p.id) {
              ctx.beginPath();
              ctx.arc(x, y, CR + 10, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(99,202,255,0.8)';
              ctx.lineWidth = 2;
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // ── name inside circle ────────────────────────────────────────────
            ctx.globalAlpha = isDimmed ? 0.3 : 1;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            const lineH = Math.max(firstFs, lastFs) + 3;
            ctx.font = `600 ${firstFs}px Outfit, -apple-system, sans-serif`;
            ctx.fillStyle = selected ? '#fff' : '#eceae5';
            ctx.fillText(firstName, x, y - lineH / 2);
            ctx.font = `700 ${lastFs}px Outfit, -apple-system, sans-serif`;
            ctx.fillStyle = selected ? '#c9a84c' : `rgba(${Math.min(br+60,255)},${Math.min(bg+60,255)},${Math.min(bb+80,255)},0.95)`;
            ctx.fillText(lastNameUp, x, y + lineH / 2);

            // ── hover card (appears above circle) ─────────────────────────────
            if (showCard) {
              const extraH  = (dateStr ? 22 : 0) + (p.occupation ? 22 : 0) + (p.birthPlace ? 20 : 0);
              const HC_H    = HC_H_BASE + extraH;
              const cardX   = x - HC_W / 2;
              const cardY   = y - CR - HC_H - 18;

              // connector
              ctx.globalAlpha = 0.5;
              ctx.beginPath();
              ctx.moveTo(x, cardY + HC_H + 1);
              ctx.lineTo(x, y - CR - 2);
              ctx.strokeStyle = `rgba(${br},${bg},${bb},0.6)`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;

              // card shadow
              ctx.shadowColor  = 'rgba(0,0,0,0.75)';
              ctx.shadowBlur   = 24;
              ctx.shadowOffsetY = 6;

              // card bg
              roundRect(ctx, cardX, cardY, HC_W, HC_H, HC_R);
              ctx.fillStyle = 'rgba(12,12,22,0.97)';
              ctx.fill();
              ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

              // card border
              roundRect(ctx, cardX, cardY, HC_W, HC_H, HC_R);
              ctx.strokeStyle = selected ? '#c9a84c' : `rgba(${br},${bg},${bb},0.65)`;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // left gender bar
              ctx.beginPath();
              ctx.moveTo(cardX + HC_R, cardY);
              ctx.lineTo(cardX + HC_R, cardY + HC_H);
              ctx.arcTo(cardX, cardY + HC_H, cardX, cardY + HC_H - HC_R, HC_R);
              ctx.lineTo(cardX, cardY + HC_R);
              ctx.arcTo(cardX, cardY, cardX + HC_R, cardY, HC_R);
              ctx.closePath();
              ctx.fillStyle = genderColor;
              ctx.globalAlpha = 0.85;
              ctx.fill();
              ctx.globalAlpha = 1;

              // card text
              const tx = cardX + 22;
              let ty   = cardY + 22;
              ctx.textAlign    = 'left';
              ctx.textBaseline = 'top';

              ctx.font = `600 18px Outfit, -apple-system, sans-serif`;
              ctx.fillStyle = '#f0ede8';
              ctx.fillText(firstName, tx, ty);
              ty += 24;

              ctx.font = `700 15px Outfit, -apple-system, sans-serif`;
              ctx.fillStyle = '#c9a84c';
              ctx.fillText(lastNameUp, tx, ty);
              ty += 22;

              if (dateStr) {
                ctx.font = `400 12px JetBrains Mono, monospace`;
                ctx.fillStyle = '#9a98a4';
                ctx.fillText(dateStr, tx, ty);
                ty += 20;
              }
              if (p.occupation) {
                ctx.font = `400 12px Outfit, -apple-system, sans-serif`;
                ctx.fillStyle = '#b8a86a';
                ctx.fillText(p.occupation, tx, ty);
                ty += 20;
              }
              if (p.birthPlace) {
                ctx.font = `400 11px Outfit, -apple-system, sans-serif`;
                ctx.fillStyle = '#6a8894';
                ctx.fillText(`📍 ${p.birthPlace}`, tx, ty);
              }
            }

            ctx.restore();
          },
          nodeDimensions: { width: CR * 2, height: CR * 2 },
        }),
        title: undefined,
      };
    });

    const edgesData = filteredRelations.map(r => {
      const color      = getRelationColor(r.type);
      const isPathEdge = highlightedPathRef.current ? isEdgeOnPath(r, highlightedPathRef.current) : false;
      return {
        id: r.id, from: r.from, to: r.to,
        label: r.label || '',
        color: { color: isPathEdge ? '#c9a84c' : color, highlight: '#c9a84c', hover: '#e0c97f', opacity: 0.75 },
        width: isPathEdge ? 3 : 1.5,
        dashes: r.type === 'parent'    ? [8, 4]
               : r.type === 'adoption'  ? [5, 3, 2, 3]
               : r.type === 'tutelle'   ? [2, 4]
               : r.type === 'witness'   ? [3, 3]
               : r.type === 'godparent' ? [10, 3, 3, 3]
               : false,
        arrows: (r.type === 'parent' || r.type === 'adoption' || r.type === 'tutelle')
          ? { to: { enabled: true, scaleFactor: 0.45 } } : undefined,
        font: { color: '#6a6874', size: 9, face: 'Outfit, system-ui, sans-serif', background: 'rgba(10,10,15,0.85)', strokeWidth: 0 },
        smooth: { enabled: true, type: 'dynamic' as const, roundness: 0.2 },
      };
    });

    const nodes = new DataSet(nodesData);
    const edges = new DataSet(edgesData);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const options: any = {
      nodes: { chosen: false, scaling: { min: CR, max: CR } },
      edges: { chosen: false, selectionWidth: 2 },
      physics: (layoutMode === 'physics' && !allHavePositions) ? {
        enabled: true,
        solver: 'barnesHut',
        barnesHut: { gravitationalConstant: -14000, centralGravity: 0.06, springLength: 280, springConstant: 0.018, damping: 0.88, avoidOverlap: 1.0 },
        stabilization: { enabled: true, iterations: 350, updateInterval: 15, fit: true },
      } : false,
      layout: layoutMode === 'hierarchical' ? {
        hierarchical: {
          direction: layoutDirection,
          sortMethod: 'directed',
          levelSeparation: layoutDirection === 'LR' || layoutDirection === 'RL' ? 220 : 160,
          nodeSpacing: layoutDirection === 'LR' || layoutDirection === 'RL' ? 120 : 220,
          treeSpacing: 260,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
        },
      } : {},
      interaction: {
        hover: true, tooltipDelay: 150, hideEdgesOnDrag: false,
        navigationButtons: false, keyboard: { enabled: true, bindToWindow: false, speed: { zoom: 0.5, move: 50 } },
        zoomView: true, dragView: true, dragNodes: true, multiselect: false, zoomSpeed: 0.35,
        hoverConnectedEdges: false,
      },
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;
    let destroyed = false;

    document.fonts.ready.then(() => {
      if (!destroyed && networkRef.current) {
        networkRef.current.redraw();
      }
    });

    const viewportKey = (mode: string) => `geneagraph:viewport:${mode}`;

    const saveState = () => {
      try {
        if (layoutMode === 'physics') {
          // Save node positions
          const positions = network.getPositions();
          globalPositionsCache.set(cacheKey, positions);
          localStorage.setItem(cacheKey, JSON.stringify(positions));
        }
        // Always save viewport (zoom + pan) for both modes
        const vp = { position: network.getViewPosition(), scale: network.getScale() };
        localStorage.setItem(viewportKey(layoutMode), JSON.stringify(vp));
      } catch {}
    };

    const saveAndCleanup = () => {
      if (networkRef.current && !destroyed) {
        try {
          if (lastLayoutModeRef.current === 'physics') {
            const positions = networkRef.current.getPositions();
            globalPositionsCache.set(positionsKey(lastLayoutModeRef.current), positions);
            localStorage.setItem(positionsKey(lastLayoutModeRef.current), JSON.stringify(positions));
          }
          const vp = { position: networkRef.current.getViewPosition(), scale: networkRef.current.getScale() };
          localStorage.setItem(viewportKey(lastLayoutModeRef.current), JSON.stringify(vp));
        } catch {}
      }
    };

    const restoreViewport = (animate: boolean) => {
      try {
        const raw = localStorage.getItem(viewportKey(layoutMode));
        if (raw) {
          const vp = JSON.parse(raw);
          network.moveTo({ position: vp.position, scale: vp.scale, animation: animate ? { duration: 500, easingFunction: 'easeOutQuart' } : false });
          return true;
        }
      } catch {}
      return false;
    };

    if (layoutMode === 'hierarchical') {
      setTimeout(() => {
        if (!destroyed) {
          const restored = restoreViewport(true);
          if (!restored) {
            network.fit({ animation: false });
            const scale = network.getScale();
            // Enforce minimum zoom so nodes stay readable
            network.moveTo({
              scale: Math.max(scale, 0.45),
              animation: { duration: 600, easingFunction: 'easeOutQuart' },
            });
          }
          saveState();
        }
      }, 450);
    } else if (allHavePositions) {
      requestAnimationFrame(() => {
        if (!destroyed) {
          const restored = restoreViewport(true);
          if (!restored) network.fit({ animation: { duration: 600, easingFunction: 'easeOutQuart' } });
        }
      });
    } else {
      network.once('stabilizationIterationsDone', () => {
        if (!destroyed) {
          network.setOptions({ physics: false });
          network.fit({ animation: { duration: 600, easingFunction: 'easeOutQuart' } });
          saveState();
        }
      });
    }

    network.on('dragEnd', () => { if (!destroyed) saveState(); });
    network.on('release', () => { if (!destroyed) saveState(); });
    network.on('zoom',    () => { if (!destroyed) saveState(); });

    network.on('click', (params: any) => {
      const clickedId: string | null = params.nodes?.length > 0 ? params.nodes[0] : null;

      if (pathModeRef.current) {
        if (!clickedId) { pathModeRef.current = false; setPathMode(false); setPathNodeA(null); pathNodeARef.current = null; network.redraw(); return; }
        if (!pathNodeARef.current) {
          pathNodeARef.current = clickedId; setPathNodeA(clickedId); network.redraw();
        } else if (pathNodeARef.current !== clickedId) {
          const path = getShortestPath(pathNodeARef.current, clickedId);
          if (path.length > 0) setHighlightedPath(path);
          pathModeRef.current = false; setPathMode(false); setPathNodeA(null); pathNodeARef.current = null;
          setSelectedPersonId(clickedId); setPanelOpen(true);
        }
        return;
      }

      if (clickedId) {
        setSelectedPersonId(clickedId);
        setPanelOpen(true);
      } else {
        setSelectedPersonId(null);
        setPanelOpen(false);
      }
    });

    network.on('hoverNode', (params: any) => setHoveredPersonId(params.node));
    network.on('blurNode', ()            => setHoveredPersonId(null));

    network.on('doubleClick', (params: any) => {
      if (params.nodes?.length > 0) {
        network.focus(params.nodes[0], { scale: 1.6, animation: { duration: 500, easingFunction: 'easeOutQuart' } });
      } else {
        quickAddTriggerRef.current?.();
      }
    });

    const handleSelectPerson = (e: Event) => {
      const id = (e as CustomEvent).detail;
      setSelectedPersonId(id);
      network.focus(id, { scale: 1.3, animation: { duration: 500, easingFunction: 'easeOutQuart' } });
    };
    window.addEventListener('geneagraph:selectPerson', handleSelectPerson);

    // Update ref for cleanup
    lastLayoutModeRef.current = layoutMode;

    return () => {
      destroyed = true;
      window.removeEventListener('geneagraph:selectPerson', handleSelectPerson);
      saveAndCleanup();
      network.destroy();
      networkRef.current = null;
    };
  }, [
    visiblePersons, filteredRelations, layoutMode, layoutDirection, branchColorMap, degreeMap,
    betweennessMap, showPivots,
    setSelectedPersonId, setHoveredPersonId, setPanelOpen, setHighlightedPath, getShortestPath,
  ]);

  useEffect(() => {
    const cleanup = createNetwork();
    return cleanup;
  }, [createNetwork]);

  // Save positions when layout mode changes
  useEffect(() => {
    return () => {
      if (networkRef.current) {
        try {
          const positions = networkRef.current.getPositions();
          const cacheKey = positionsKey(layoutMode);
          globalPositionsCache.set(cacheKey, positions);
          localStorage.setItem(cacheKey, JSON.stringify(positions));
        } catch {}
      }
    };
  }, [layoutMode]);

  // Save positions before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (networkRef.current) {
        try {
          const positions = networkRef.current.getPositions();
          const cacheKey = positionsKey(layoutMode);
          globalPositionsCache.set(cacheKey, positions);
          localStorage.setItem(cacheKey, JSON.stringify(positions));
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [layoutMode]);

  // Periodic save every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (networkRef.current) {
        try {
          const positions = networkRef.current.getPositions();
          const cacheKey = positionsKey(layoutMode);
          globalPositionsCache.set(cacheKey, positions);
        } catch {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [layoutMode]);

  const handleQuickAdd = () => {
    if (!quickForm.firstName.trim()) return;
    const newId = addPerson({ firstName: quickForm.firstName.trim(), lastName: quickForm.lastName.trim(), gender: quickForm.gender });
    setQuickAddOpen(false);
    setTimeout(() => {
      setSelectedPersonId(newId);
      setPanelOpen(true);
    }, 80);
  };

  return (
    <div className="relative flex-1 h-screen bg-[#080810] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" style={{ background: '#080810' }} />

      {/* HUD Controls */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 max-w-[calc(100vw-32px)]">
        <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center gap-1">
          <button
            onClick={() => networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeOutQuart' } })}
            className="p-2 rounded-md text-[#8a8894] hover:text-[#e8e6e1] hover:bg-[#1e1e28] transition-colors cursor-pointer"
            title="Réinitialiser la vue"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <div className="w-px h-4 bg-[#2a2a3a]" />
          <button
            onClick={() => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }}
            className="p-2 rounded-md text-[#8a8894] hover:text-[#e8e6e1] hover:bg-[#1e1e28] transition-colors cursor-pointer"
            title="Plein écran"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center">
          <button onClick={() => setLayoutMode('physics')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${layoutMode === 'physics' ? 'bg-[#c9a84c] text-[#0a0a0f]' : 'text-[#8a8894] hover:text-[#e8e6e1]'}`}>Réseau</button>
          <button onClick={() => setLayoutMode('hierarchical')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${layoutMode === 'hierarchical' ? 'bg-[#c9a84c] text-[#0a0a0f]' : 'text-[#8a8894] hover:text-[#e8e6e1]'}`}>Hiérarchie</button>
        </div>

        {layoutMode === 'hierarchical' && (
          <>
            <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center gap-0.5">
              {(['UD', 'DU', 'LR', 'RL'] as LayoutDirection[]).map(dir => (
                <button
                  key={dir}
                  onClick={() => setLayoutDirection(dir)}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${layoutDirection === dir ? 'bg-[#c9a84c]/20 text-[#c9a84c]' : 'text-[#5a5864] hover:text-[#e8e6e1]'}`}
                  title={dir === 'UD' ? 'Haut → Bas' : dir === 'DU' ? 'Bas → Haut' : dir === 'LR' ? 'Gauche → Droite' : 'Droite → Gauche'}
                >
                  {dir === 'UD' ? <ArrowDown size={14} /> : dir === 'DU' ? <ArrowUp size={14} /> : dir === 'LR' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                </button>
              ))}
            </div>

            <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center gap-0.5">
              {(['all', 'ancestors', 'descendants'] as HierarchyFocus[]).map(focus => (
                <button
                  key={focus}
                  onClick={() => { setHierarchyFocus(focus); if (focus !== 'all' && selectedPersonId) setHierarchyRootId(selectedPersonId); }}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${hierarchyFocus === focus ? 'bg-[#4a90a4]/20 text-[#4a90a4]' : 'text-[#5a5864] hover:text-[#e8e6e1]'}`}
                  title={focus === 'all' ? 'Tout afficher' : focus === 'ancestors' ? 'Ancêtres uniquement' : 'Descendants uniquement'}
                >
                  {focus === 'all' ? <Users size={14} /> : focus === 'ancestors' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                </button>
              ))}
            </div>

            {hierarchyFocus !== 'all' && (
              <select
                value={hierarchyRootId || ''}
                onChange={e => setHierarchyRootId(e.target.value || null)}
                className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg px-2 py-1.5 text-[11px] text-[#e8e6e1] cursor-pointer"
              >
                <option value="">Sélectionner une racine</option>
                {persons.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            )}
          </>
        )}

        <button
          onClick={() => quickAddTriggerRef.current?.()}
          className="bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/40 hover:border-[#c9a84c]/70 text-[#c9a84c] rounded-lg p-2 transition-all backdrop-blur-sm cursor-pointer"
          title="Ajouter une personne (ou double-cliquer sur le canvas)"
        >
          <Plus size={15} />
        </button>

        <button
          onClick={toggleShowPivots}
          title="Nœuds pivot (betweenness centrality)"
          className={`rounded-lg p-2 transition-all backdrop-blur-sm cursor-pointer border ${showPivots ? 'bg-[#c9a84c]/20 border-[#c9a84c]/60 text-[#c9a84c]' : 'bg-[#14141c]/90 border-[#2a2a3a] text-[#5a5864] hover:text-[#e8e6e1]'}`}
        >
          <GitMerge size={15} />
        </button>

        <button
          onClick={() => {
            const next = !pathMode;
            setPathMode(next);
            if (!next) { setPathNodeA(null); pathNodeARef.current = null; networkRef.current?.redraw(); }
          }}
          title="Trouver le chemin entre deux personnes"
          className={`rounded-lg p-2 transition-all backdrop-blur-sm cursor-pointer border ${pathMode ? 'bg-[#4a9eff]/20 border-[#4a9eff]/60 text-[#4a9eff]' : 'bg-[#14141c]/90 border-[#2a2a3a] text-[#5a5864] hover:text-[#e8e6e1]'}`}
        >
          <Link2 size={15} />
        </button>

        <button
          onClick={() => {
            if (containerRef.current) {
              const canvas = containerRef.current.querySelector('canvas');
              if (canvas) {
                const link = document.createElement('a');
                link.download = 'geneagraph.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
              }
            }
          }}
          title="Exporter en PNG"
          className="rounded-lg p-2 transition-all backdrop-blur-sm cursor-pointer border bg-[#14141c]/90 border-[#2a2a3a] text-[#5a5864] hover:text-[#e8e6e1]"
        >
          <Download size={15} />
        </button>
      </div>

      {pathMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-[#0f0f1a]/95 border border-[#4a9eff]/40 rounded-lg px-4 py-2 text-[12px] text-[#4a9eff] backdrop-blur-sm pointer-events-none flex items-center gap-2">
          <Link2 size={12} />
          {pathNodeA ? 'Cliquez la 2ème personne…' : 'Cliquez la 1ère personne…'}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[#0f0f18]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg px-3 py-2.5">
        <p className="text-[10px] text-[#5a5864] uppercase tracking-[0.12em] mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Légende</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full border-2 border-[#4a9eff] bg-[#0f1c2e]" />
            <span className="text-[10px] text-[#6a6874]">Homme</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full border-2 border-[#f472b6] bg-[#200e1e]" />
            <span className="text-[10px] text-[#6a6874]">Femme</span>
          </div>
          <div className="w-full h-px bg-[#1e1e28] my-0.5" />
          {[
            { color: '#4a9eff', label: 'Parenté' },
            { color: '#c9a84c', label: 'Alliance' },
            { color: '#f97316', label: 'Adoption' },
            { color: '#06b6d4', label: 'Tutelle' },
            { color: '#8b5cf6', label: 'Témoin' },
            { color: '#10b981', label: 'Parrainage' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-5 h-0 border-t-2" style={{ borderColor: color }} />
              <span className="text-[10px] text-[#6a6874]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] text-[#2a2a3a] pointer-events-none select-none" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        Double-clic sur le canvas pour ajouter
      </div>

      {/* Quick-add dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Nouvelle personne</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#5a5864] uppercase tracking-wider block mb-1">Prénom</label>
                <input autoFocus value={quickForm.firstName} onChange={e => setQuickForm(f => ({ ...f, firstName: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} placeholder="Jean"
                  className="w-full bg-[#1e1e28] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#e8e6e1] placeholder-[#3a3844] focus:outline-none focus:border-[#c9a84c]/60 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] text-[#5a5864] uppercase tracking-wider block mb-1">Nom</label>
                <input value={quickForm.lastName} onChange={e => setQuickForm(f => ({ ...f, lastName: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} placeholder="Dupont"
                  className="w-full bg-[#1e1e28] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#e8e6e1] placeholder-[#3a3844] focus:outline-none focus:border-[#c9a84c]/60 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#5a5864] uppercase tracking-wider block mb-1">Genre</label>
              <div className="flex gap-2">
                {(['M', 'F'] as const).map(g => (
                  <button key={g} onClick={() => setQuickForm(f => ({ ...f, gender: g }))}
                    className={`flex-1 py-2 rounded-md text-[12px] font-medium border transition-all cursor-pointer ${quickForm.gender === g ? (g === 'M' ? 'bg-[#0f1c2e] border-[#4a9eff] text-[#4a9eff]' : 'bg-[#200e1e] border-[#f472b6] text-[#f472b6]') : 'bg-transparent border-[#2a2a3a] text-[#5a5864] hover:border-[#3a3a4a]'}`}>
                    {g === 'M' ? 'Homme' : 'Femme'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setQuickAddOpen(false)} className="px-4 py-2 rounded-md text-[12px] text-[#8a8894] hover:text-[#e8e6e1] border border-[#2a2a3a] hover:bg-[#1e1e28] transition-all cursor-pointer">Annuler</button>
            <button onClick={handleQuickAdd} disabled={!quickForm.firstName.trim()} className="px-4 py-2 rounded-md text-[12px] font-medium bg-[#c9a84c] text-[#0a0a0f] hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
