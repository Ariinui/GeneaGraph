import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { Plus, Link2, GitMerge, ArrowDown, ArrowUp, ArrowRight, ArrowLeft, Download, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import type { Person, Relation, LayoutDirection, HierarchyFocus } from '@/types/genealogy';

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

function buildTooltip(person: Person): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'background:#1a1a28;border:1px solid #2a2a3a;border-radius:10px;padding:12px 14px;min-width:170px;font-family:Outfit,system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  const badge = document.createElement('div');
  badge.style.cssText = `width:10px;height:10px;border-radius:50%;border:2px solid ${person.gender === 'M' ? '#4a9eff' : '#f472b6'};background:${person.gender === 'M' ? '#0f1c2e' : '#200e1e'};flex-shrink:0;`;
  header.appendChild(badge);
  const name = document.createElement('div');
  name.style.cssText = 'font-size:13px;font-weight:600;color:#e8e6e1;';
  name.textContent = `${person.firstName} ${person.lastName}`;
  header.appendChild(name);
  el.appendChild(header);

  const years: string[] = [];
  if (person.birthDate) years.push(`∗ ${person.birthDate.split('-')[0]}`);
  if (person.deathDate) years.push(`† ${person.deathDate.split('-')[0]}`);
  if (years.length) {
    const d = document.createElement('div');
    d.style.cssText = 'font-size:11px;color:#7a7884;margin-bottom:3px;';
    d.textContent = years.join('  ·  ');
    el.appendChild(d);
  }
  if (person.occupation) {
    const o = document.createElement('div');
    o.style.cssText = 'font-size:11px;color:#c9a84c;margin-top:4px;';
    o.textContent = person.occupation;
    el.appendChild(o);
  }
  if (person.birthPlace) {
    const pl = document.createElement('div');
    pl.style.cssText = 'font-size:10px;color:#4a4854;margin-top:3px;';
    pl.textContent = `📍 ${person.birthPlace}`;
    el.appendChild(pl);
  }
  return el;
}

function isEdgeOnPath(edge: Relation, path: string[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)) return true;
  }
  return false;
}

const positionsKey = (mode: string) => `geneagraph:positions:${mode}`;

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

    const nodesData = visiblePersons.map(p => {
      const degree      = degreeMap.get(p.id) || 0;
      const size        = Math.max(36, Math.min(56, 36 + degree * 3));
      const branchColor = p.branch ? (branchColorMap.get(p.branch) || '#5a5a6a') : '#3a3a4a';
      const genderColor = p.gender === 'M' ? '#4a9eff' : '#f472b6';
      const firstName   = p.firstName || '';
      const lastName    = p.lastName  || '';
      const [br, bg, bb] = hexToRgb(branchColor);

      // Max usable text width inside circle (inscribed rectangle ≈ r*√2)
      const maxTextW = size * 1.28;

      // Pre-compute font size once (avoid measureText loop every frame)
      const longestWord = firstName.length >= lastName.length ? firstName : lastName;
      let cachedFs = Math.min(15, Math.max(9, Math.round(size * 0.38)));
      measureCtx.font = `600 ${cachedFs}px Outfit, -apple-system, sans-serif`;
      while (measureCtx.measureText(longestWord).width > maxTextW && cachedFs > 8) {
        cachedFs--;
        measureCtx.font = `600 ${cachedFs}px Outfit, -apple-system, sans-serif`;
      }
      const nodeFs   = cachedFs;
      const nodeLineH = nodeFs + 3;
      const nodeTotalH = nodeLineH * 2 - 3;

      return {
        id: p.id,
        label: '',
        size,
        x: savedPositions[p.id]?.x,
        y: savedPositions[p.id]?.y,
        shape: 'custom' as const,
        ctxRenderer: ({ ctx, x, y, state: { selected, hover } }: any) => ({
          drawNode() {
            const isDimmed = dimmedRef.current.has(p.id);
            const isOnPath = highlightedPathRef.current?.includes(p.id) || false;
            const r        = size;

            ctx.save();
            ctx.globalAlpha = isDimmed ? 0.18 : 1;

            // ── glow ─────────────────────────────────────────────────────────
            if (selected) {
              ctx.shadowColor = 'rgba(201,168,76,0.8)'; ctx.shadowBlur = 24;
            } else if (isOnPath) {
              ctx.shadowColor = 'rgba(201,168,76,0.45)'; ctx.shadowBlur = 14;
            } else if (!isDimmed) {
              ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
            }

            // ── fill ─────────────────────────────────────────────────────────
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(${br},${bg},${bb},${selected ? 0.55 : 0.3})`;
            ctx.fill();
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

            // ── border ───────────────────────────────────────────────────────
            ctx.strokeStyle = selected ? '#c9a84c' : isOnPath ? '#e0c97f' : hover ? '#c9a84c' : genderColor;
            ctx.lineWidth   = selected || isOnPath ? 3.5 : 2;
            ctx.stroke();

            // ── pivot ring ───────────────────────────────────────────────────
            const pivotScore = betweennessMap.get(p.id) || 0;
            if (showPivots && pivotScore > 0.1) {
              ctx.beginPath();
              ctx.arc(x, y, r + 5 + pivotScore * 4, 0, 2 * Math.PI);
              ctx.strokeStyle = `rgba(201,168,76,${0.3 + pivotScore * 0.6})`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 3]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // ── path-mode node A marker ──────────────────────────────────────
            if (pathNodeARef.current === p.id) {
              ctx.beginPath();
              ctx.arc(x, y, r + 8, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(99,202,255,0.8)';
              ctx.lineWidth = 2;
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // ── name inside (cached font size) ────────────────────────────────
            const textColor = isDimmed ? 'rgba(200,200,200,0.35)' : selected ? '#ffffff' : '#eceae5';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = textColor;
            ctx.font = `600 ${nodeFs}px Outfit, -apple-system, sans-serif`;

            const startY = y - nodeTotalH / 2 + nodeFs * 0.35;
            ctx.fillText(firstName, x, startY);
            ctx.fillText(lastName,  x, startY + nodeLineH);

            ctx.restore();
          },
          nodeDimensions: { width: size * 2, height: size * 2 },
        }),
        title: buildTooltip(p),
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
        smooth: { enabled: true, type: 'continuous' as const, roundness: 0.15 },
      };
    });

    const nodes = new DataSet(nodesData);
    const edges = new DataSet(edgesData);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const options: any = {
      nodes: { chosen: false, scaling: { min: 26, max: 44 } },
      edges: { chosen: false, selectionWidth: 2 },
      physics: (layoutMode === 'physics' && !allHavePositions) ? {
        enabled: true,
        solver: 'barnesHut',
        barnesHut: { gravitationalConstant: -8000, centralGravity: 0.12, springLength: 300, springConstant: 0.028, damping: 0.92, avoidOverlap: 1.0 },
        stabilization: { enabled: true, iterations: 250, updateInterval: 15, fit: true },
      } : false,
      layout: layoutMode === 'hierarchical' ? {
        hierarchical: { 
          direction: layoutDirection,
          sortMethod: 'directed',
          levelSeparation: layoutDirection === 'LR' || layoutDirection === 'RL' ? 220 : 160,
          nodeSpacing: layoutDirection === 'LR' || layoutDirection === 'RL' ? 120 : 180,
          treeSpacing: 260,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
          shakeTowards: 'leaves'
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

    const savePositions = () => {
      try {
        const positions = network.getPositions();
        const cacheKey = positionsKey(layoutMode);
        
        // Save to in-memory cache (immediate, survives recreation)
        globalPositionsCache.set(cacheKey, positions);
        
        // Save to localStorage (persistent across sessions)
        localStorage.setItem(cacheKey, JSON.stringify(positions));
      } catch {}
    };

    // Save positions before destroying
    const saveAndCleanup = () => {
      if (networkRef.current && !destroyed) {
        try {
          const positions = networkRef.current.getPositions();
          const cacheKey = positionsKey(lastLayoutModeRef.current);
          globalPositionsCache.set(cacheKey, positions);
          localStorage.setItem(cacheKey, JSON.stringify(positions));
        } catch {}
      }
    };

    if (layoutMode === 'hierarchical') {
      // vis-network places nodes directly; stabilizationIterationsDone won't fire with physics:false
      setTimeout(() => {
        if (!destroyed) {
          network.fit({ animation: { duration: 600, easingFunction: 'easeOutQuart' } });
          savePositions();
        }
      }, 400);
    } else if (allHavePositions) {
      requestAnimationFrame(() => {
        if (!destroyed) {
          network.fit({ animation: { duration: 600, easingFunction: 'easeOutQuart' } });
        }
      });
    } else {
      network.once('stabilizationIterationsDone', () => {
        if (!destroyed) {
          network.setOptions({ physics: false });
          network.fit({ animation: { duration: 600, easingFunction: 'easeOutQuart' } });
          savePositions();
        }
      });
    }

    network.on('dragEnd', () => { if (!destroyed) savePositions(); });
    
    // Save positions when a node is released after dragging
    network.on('release', () => { if (!destroyed) savePositions(); });

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
