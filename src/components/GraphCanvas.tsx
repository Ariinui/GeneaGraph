import { useEffect, useRef, useCallback, useState } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import type { Person, Relation } from '@/types/genealogy';

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
  el.style.cssText = 'background:#1a1a28;border:1px solid #2a2a3a;border-radius:10px;padding:12px 14px;min-width:170px;font-family:Inter,system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

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

// ── component ─────────────────────────────────────────────────────────────────

export default function GraphCanvas() {
  const containerRef       = useRef<HTMLDivElement>(null);
  const networkRef         = useRef<Network | null>(null);
  const nodesRef           = useRef<DataSet<any> | null>(null);
  const edgesRef           = useRef<DataSet<any> | null>(null);
  const quickAddTriggerRef = useRef<(() => void) | null>(null);
  const dimmedRef          = useRef<Set<string>>(new Set());
  const highlightedPathRef = useRef<string[] | null>(null);

  const {
    persons, relations, branches,
    selectedPersonId, setSelectedPersonId,
    layoutMode, setLayoutMode,
    activeFilters, activeBranchFilters,
    setHoveredPersonId,
    highlightedPath,
    addPerson,
  } = useApp();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({ firstName: '', lastName: '', gender: 'M' as 'M' | 'F' });

  quickAddTriggerRef.current = () => {
    setQuickForm({ firstName: '', lastName: '', gender: 'M' });
    setQuickAddOpen(true);
  };

  const branchColorMap = new Map<string, string>();
  branches.forEach(b => branchColorMap.set(b.id, b.color));

  const filteredRelations = relations.filter(r => {
    if (!activeFilters.includes(r.type)) return false;
    const from = persons.find(p => p.id === r.from);
    const to   = persons.find(p => p.id === r.to);
    if (!from || !to) return false;
    if (from.branch && !activeBranchFilters.includes(from.branch)) return false;
    if (to.branch   && !activeBranchFilters.includes(to.branch))   return false;
    return true;
  });

  const visiblePersonIds = new Set<string>();
  filteredRelations.forEach(r => { visiblePersonIds.add(r.from); visiblePersonIds.add(r.to); });
  persons.forEach(p => { if (!p.branch || activeBranchFilters.includes(p.branch)) visiblePersonIds.add(p.id); });
  const visiblePersons = persons.filter(p => visiblePersonIds.has(p.id));

  const degreeMap = new Map<string, number>();
  visiblePersons.forEach(p => degreeMap.set(p.id, 0));
  filteredRelations.forEach(r => {
    degreeMap.set(r.from, (degreeMap.get(r.from) || 0) + 1);
    degreeMap.set(r.to,   (degreeMap.get(r.to)   || 0) + 1);
  });

  // ── sync path ref → redraw without recreating network ─────────────────────
  useEffect(() => {
    highlightedPathRef.current = highlightedPath;
    networkRef.current?.redraw();
  }, [highlightedPath]);

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

      return {
        id: p.id,
        label: '',
        size,
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

            // ── name inside: auto-fit font size ──────────────────────────────
            const textColor = isDimmed ? 'rgba(200,200,200,0.35)' : selected ? '#ffffff' : '#eceae5';
            ctx.textAlign   = 'center';
            ctx.fillStyle   = textColor;

            // Find font size that fits longest of the two lines
            const longestWord = firstName.length >= lastName.length ? firstName : lastName;
            let fs = Math.min(15, Math.max(9, Math.round(r * 0.38)));
            ctx.font = `600 ${fs}px Inter, -apple-system, sans-serif`;
            while (ctx.measureText(longestWord).width > maxTextW && fs > 8) {
              fs--;
              ctx.font = `600 ${fs}px Inter, -apple-system, sans-serif`;
            }

            const lineH  = fs + 3;
            const totalH = lineH * 2 - 3;
            const startY = y - totalH / 2 + fs * 0.35;

            ctx.textBaseline = 'middle';
            ctx.fillText(firstName, x, startY);
            ctx.fillText(lastName,  x, startY + lineH);

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
        font: { color: '#6a6874', size: 9, face: 'Inter, system-ui, sans-serif', background: 'rgba(10,10,15,0.85)', strokeWidth: 0 },
        smooth: { enabled: true, type: 'continuous' as const, roundness: 0.15 },
      };
    });

    const nodes = new DataSet(nodesData);
    const edges = new DataSet(edgesData);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const options: any = {
      nodes: { chosen: true, scaling: { min: 26, max: 44 } },
      edges: { chosen: true, selectionWidth: 2 },
      physics: layoutMode === 'physics' ? {
        enabled: true,
        solver: 'barnesHut',
        barnesHut: { gravitationalConstant: -8000, centralGravity: 0.12, springLength: 300, springConstant: 0.028, damping: 0.92, avoidOverlap: 1.0 },
        stabilization: { enabled: true, iterations: 250, updateInterval: 15, fit: true },
      } : false,
      layout: layoutMode === 'hierarchical' ? {
        hierarchical: { direction: 'UD', sortMethod: 'directed', levelSeparation: 160, nodeSpacing: 220, treeSpacing: 260, blockShifting: true, edgeMinimization: true, parentCentralization: true },
      } : {},
      interaction: {
        hover: true, tooltipDelay: 150, hideEdgesOnDrag: false,
        navigationButtons: false, keyboard: false,
        zoomView: true, dragView: true, multiselect: false, zoomSpeed: 0.6,
      },
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // Ensure fonts loaded for canvas text
    document.fonts.ready.then(() => network.redraw());

    network.once('stabilizationIterationsDone', () => {
      network.setOptions({ physics: false });
      network.fit({ animation: { duration: 600, easingFunction: 'easeOutQuart' } });
    });

    network.on('click', (params: any) => {
      setSelectedPersonId(params.nodes?.length > 0 ? params.nodes[0] : null);
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

    return () => {
      window.removeEventListener('geneagraph:selectPerson', handleSelectPerson);
      network.destroy();
    };
  }, [
    visiblePersons, filteredRelations, layoutMode, branches,
    setSelectedPersonId, setHoveredPersonId,
    // selectedPersonId & highlightedPath intentionally excluded — handled via refs
  ]);

  useEffect(() => {
    const cleanup = createNetwork();
    return cleanup;
  }, [createNetwork]);

  const handleQuickAdd = () => {
    if (!quickForm.firstName.trim()) return;
    addPerson({ firstName: quickForm.firstName.trim(), lastName: quickForm.lastName.trim(), gender: quickForm.gender });
    setQuickAddOpen(false);
  };

  return (
    <div className="relative flex-1 h-screen bg-[#080810] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" style={{ background: '#080810' }} />

      {/* HUD Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center gap-1">
          <button
            onClick={() => networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeOutQuart' } })}
            className="p-2 rounded-md text-[#8a8894] hover:text-[#e8e6e1] hover:bg-[#1e1e28] transition-colors"
            title="Réinitialiser la vue"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <div className="w-px h-4 bg-[#2a2a3a]" />
          <button
            onClick={() => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }}
            className="p-2 rounded-md text-[#8a8894] hover:text-[#e8e6e1] hover:bg-[#1e1e28] transition-colors"
            title="Plein écran"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center">
          <button onClick={() => setLayoutMode('physics')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${layoutMode === 'physics' ? 'bg-[#c9a84c] text-[#0a0a0f]' : 'text-[#8a8894] hover:text-[#e8e6e1]'}`}>Réseau</button>
          <button onClick={() => setLayoutMode('hierarchical')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${layoutMode === 'hierarchical' ? 'bg-[#c9a84c] text-[#0a0a0f]' : 'text-[#8a8894] hover:text-[#e8e6e1]'}`}>Hiérarchie</button>
        </div>

        <button
          onClick={() => quickAddTriggerRef.current?.()}
          className="bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/40 hover:border-[#c9a84c]/70 text-[#c9a84c] rounded-lg p-2 transition-all backdrop-blur-sm"
          title="Ajouter une personne (ou double-cliquer sur le canvas)"
        >
          <Plus size={15} />
        </button>
      </div>

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
                    className={`flex-1 py-2 rounded-md text-[12px] font-medium border transition-all ${quickForm.gender === g ? (g === 'M' ? 'bg-[#0f1c2e] border-[#4a9eff] text-[#4a9eff]' : 'bg-[#200e1e] border-[#f472b6] text-[#f472b6]') : 'bg-transparent border-[#2a2a3a] text-[#5a5864] hover:border-[#3a3a4a]'}`}>
                    {g === 'M' ? 'Homme' : 'Femme'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setQuickAddOpen(false)} className="px-4 py-2 rounded-md text-[12px] text-[#8a8894] hover:text-[#e8e6e1] border border-[#2a2a3a] hover:bg-[#1e1e28] transition-all">Annuler</button>
            <button onClick={handleQuickAdd} disabled={!quickForm.firstName.trim()} className="px-4 py-2 rounded-md text-[12px] font-medium bg-[#c9a84c] text-[#0a0a0f] hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
