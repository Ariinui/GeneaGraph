import { useEffect, useRef, useCallback } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { useApp } from '@/context/AppContext';
import type { Person } from '@/types/genealogy';
import type { Relation } from '@/types/genealogy';

export default function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<any> | null>(null);
  const edgesRef = useRef<DataSet<any> | null>(null);
  const {
    persons,
    relations,
    branches,
    selectedPersonId,
    setSelectedPersonId,
    layoutMode,
    setLayoutMode,
    activeFilters,
    activeBranchFilters,
    setHoveredPersonId,
    highlightedPath,
  } = useApp();

  const branchColorMap = new Map<string, string>();
  branches.forEach((b) => branchColorMap.set(b.id, b.color));

  const filteredRelations = relations.filter((r) => {
    if (!activeFilters.includes(r.type)) return false;
    const fromPerson = persons.find((p) => p.id === r.from);
    const toPerson = persons.find((p) => p.id === r.to);
    if (!fromPerson || !toPerson) return false;
    if (fromPerson.branch && !activeBranchFilters.includes(fromPerson.branch)) return false;
    if (toPerson.branch && !activeBranchFilters.includes(toPerson.branch)) return false;
    return true;
  });

  const visiblePersonIds = new Set<string>();
  filteredRelations.forEach((r) => {
    visiblePersonIds.add(r.from);
    visiblePersonIds.add(r.to);
  });
  persons.forEach((p) => {
    if (!p.branch || activeBranchFilters.includes(p.branch)) {
      visiblePersonIds.add(p.id);
    }
  });

  const visiblePersons = persons.filter((p) => visiblePersonIds.has(p.id));

  const degreeMap = new Map<string, number>();
  visiblePersons.forEach((p) => degreeMap.set(p.id, 0));
  filteredRelations.forEach((r) => {
    degreeMap.set(r.from, (degreeMap.get(r.from) || 0) + 1);
    degreeMap.set(r.to, (degreeMap.get(r.to) || 0) + 1);
  });

  const createNetwork = useCallback(() => {
    if (!containerRef.current) return;

    const nodesData = visiblePersons.map((p) => {
      const degree = degreeMap.get(p.id) || 0;
      const size = Math.max(20, Math.min(40, 20 + degree * 3));
      const branchColor = p.branch ? branchColorMap.get(p.branch) || '#c9a84c' : '#8a8894';
      const isSelected = p.id === selectedPersonId;
      const isHighlighted = highlightedPath?.includes(p.id);

      return {
        id: p.id,
        label: `${p.firstName}\n${p.lastName}`,
        size,
        color: {
          background: isSelected ? '#1e1e28' : '#14141c',
          border: isHighlighted ? '#c9a84c' : p.gender === 'M' ? '#4a9eff' : '#f43f5e',
          highlight: { background: '#1e1e28', border: '#c9a84c' },
          hover: { background: '#1e1e28', border: '#c9a84c' },
        },
        borderWidth: isSelected || isHighlighted ? 3 : 2,
        font: {
          color: '#e8e6e1',
          size: 11,
          face: 'JetBrains Mono',
          multi: 'html',
        },
        shape: 'dot' as const,
        shadow: isSelected
          ? { enabled: true, color: 'rgba(201,168,76,0.4)', size: 20 }
          : { enabled: false },
        title: buildTooltip(p, branchColor),
      };
    });

    const edgesData = filteredRelations.map((r) => {
      const color = getRelationColor(r.type);
      const isPathEdge = highlightedPath
        ? isEdgeOnPath(r, highlightedPath)
        : false;

      return {
        id: r.id,
        from: r.from,
        to: r.to,
        label: r.label || '',
        color: {
          color: isPathEdge ? '#c9a84c' : color,
          highlight: '#c9a84c',
          hover: '#e0c97f',
          opacity: isPathEdge ? 1 : 0.8,
        },
        width: isPathEdge ? 3 : 1.5,
        dashes: r.type === 'parent' ? [8, 4] : r.type === 'witness' ? [3, 3] : r.type === 'godparent' ? [10, 3, 3, 3] : false,
        arrows: r.type === 'parent' ? { to: { enabled: true, scaleFactor: 0.5 } } : undefined,
        font: {
          color: '#8a8894',
          size: 9,
          face: 'JetBrains Mono',
          background: '#0a0a0f',
        },
        smooth: {
          enabled: true,
          type: 'continuous' as const,
          roundness: 0.2,
        },
      };
    });

    const nodes = new DataSet(nodesData);
    const edges = new DataSet(edgesData);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const options: any = {
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 3,
        chosen: true,
      },
      edges: {
        chosen: true,
        selectionWidth: 2,
      },
      physics: layoutMode === 'physics'
        ? {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -2000,
              centralGravity: 0.3,
              springLength: 150,
              springConstant: 0.04,
              damping: 0.9,
            },
            stabilization: {
              enabled: true,
              iterations: 200,
              updateInterval: 25,
            },
          }
        : false,
      layout: layoutMode === 'hierarchical'
        ? {
            hierarchical: {
              direction: 'UD',
              sortMethod: 'directed',
              levelSeparation: 120,
              nodeSpacing: 150,
              treeSpacing: 200,
              blockShifting: true,
              edgeMinimization: true,
              parentCentralization: true,
            },
          }
        : {},
      interaction: {
        hover: true,
        tooltipDelay: 100,
        hideEdgesOnDrag: false,
        navigationButtons: false,
        keyboard: false,
        zoomView: true,
        dragView: true,
        multiselect: true,
      },
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    network.once('stabilizationIterationsDone', () => {
      network.setOptions({ physics: false });
    });

    network.on('click', (params: any) => {
      if (params.nodes && params.nodes.length > 0) {
        setSelectedPersonId(params.nodes[0]);
      } else {
        setSelectedPersonId(null);
      }
    });

    network.on('hoverNode', (params: any) => {
      setHoveredPersonId(params.node);
    });

    network.on('blurNode', () => {
      setHoveredPersonId(null);
    });

    network.on('doubleClick', (params: any) => {
      if (params.nodes && params.nodes.length > 0) {
        network.focus(params.nodes[0], {
          scale: 1.5,
          animation: { duration: 500, easingFunction: 'easeOutQuart' },
        });
      }
    });

    const handleSelectPerson = (e: Event) => {
      const customEvent = e as CustomEvent;
      const personId = customEvent.detail;
      setSelectedPersonId(personId);
      network.focus(personId, {
        scale: 1.2,
        animation: { duration: 500, easingFunction: 'easeOutQuart' },
      });
    };
    window.addEventListener('geneagraph:selectPerson', handleSelectPerson);

    return () => {
      window.removeEventListener('geneagraph:selectPerson', handleSelectPerson);
      network.destroy();
    };
  }, [
    visiblePersons,
    filteredRelations,
    selectedPersonId,
    layoutMode,
    highlightedPath,
    branches,
    setSelectedPersonId,
    setHoveredPersonId,
  ]);

  useEffect(() => {
    const cleanup = createNetwork();
    return cleanup;
  }, [createNetwork]);

  // Highlight neighbors when selected
  useEffect(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const network = networkRef.current;
    if (!nodes || !edges || !network) return;

    try {
      if (selectedPersonId) {
        const connectedNodes = network.getConnectedNodes(selectedPersonId) as string[];
        const allNodeIds = visiblePersons.map((p) => p.id);
        const unconnectedNodes = allNodeIds.filter(
          (id) => id !== selectedPersonId && !connectedNodes.includes(id)
        );

        const nodeUpdates = unconnectedNodes.map((id) => ({
          id,
          color: { background: '#14141c', border: '#2a2a3a' },
          font: { color: '#5a5864' },
        }));
        nodes.update(nodeUpdates);

        const allEdgeIds = edges.getIds();
        const connectedEdgeIds = network.getConnectedEdges(selectedPersonId);
        const unconnectedEdgeIds = allEdgeIds.filter(
          (id: string | number) => !connectedEdgeIds.includes(id as string)
        );
        edges.update(
          unconnectedEdgeIds.map((id: string | number) => ({
            id,
            color: { opacity: 0.15 },
          }))
        );
      } else {
        const allNodes = visiblePersons.map((p) => ({
          id: p.id,
          color: {
            background: '#14141c',
            border: p.gender === 'M' ? '#4a9eff' : '#f43f5e',
          },
          font: { color: '#e8e6e1' },
        }));
        nodes.update(allNodes);

        const allEdges = filteredRelations.map((r) => ({
          id: r.id,
          color: { opacity: 0.8, color: getRelationColor(r.type) },
        }));
        edges.update(allEdges);
      }
    } catch {
      // Network might be destroyed
    }
  }, [selectedPersonId, visiblePersons, filteredRelations]);

  return (
    <div className="relative flex-1 h-screen bg-[#0a0a0f] overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ background: '#0a0a0f', cursor: 'crosshair' }}
      />

      {/* HUD Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center gap-1">
          <button
            onClick={() => {
              networkRef.current?.fit({
                animation: { duration: 500, easingFunction: 'easeOutQuart' },
              });
            }}
            className="p-2 rounded-md text-[#8a8894] hover:text-[#e8e6e1] hover:bg-[#1e1e28] transition-colors"
            title="Réinitialiser la vue"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <div className="w-px h-4 bg-[#2a2a3a]" />
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                containerRef.current?.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-2 rounded-md text-[#8a8894] hover:text-[#e8e6e1] hover:bg-[#1e1e28] transition-colors"
            title="Plein écran"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        <div className="bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg p-1 flex items-center">
          <button
            onClick={() => setLayoutMode('physics')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              layoutMode === 'physics'
                ? 'bg-[#c9a84c] text-[#0a0a0f]'
                : 'text-[#8a8894] hover:text-[#e8e6e1]'
            }`}
          >
            Réseau
          </button>
          <button
            onClick={() => setLayoutMode('hierarchical')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              layoutMode === 'hierarchical'
                ? 'bg-[#c9a84c] text-[#0a0a0f]'
                : 'text-[#8a8894] hover:text-[#e8e6e1]'
            }`}
          >
            Hiérarchie
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[#14141c]/90 backdrop-blur-sm border border-[#2a2a3a] rounded-lg px-3 py-2.5">
        <p className="text-[10px] text-[#5a5864] uppercase tracking-[0.12em] mb-1.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Légende
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-dashed" style={{ borderColor: '#4a9eff' }} />
            <span className="text-[10px] text-[#8a8894]">Parenté</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2" style={{ borderColor: '#c9a84c' }} />
            <span className="text-[10px] text-[#8a8894]">Alliance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-dotted" style={{ borderColor: '#8b5cf6' }} />
            <span className="text-[10px] text-[#8a8894]">Témoin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2" style={{ borderColor: '#10b981', borderStyle: 'dash-dot' }} />
            <span className="text-[10px] text-[#8a8894]">Parrainage</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRelationColor(type: string): string {
  switch (type) {
    case 'parent': return '#4a9eff';
    case 'alliance': return '#c9a84c';
    case 'witness': return '#8b5cf6';
    case 'godparent': return '#10b981';
    default: return '#8a8894';
  }
}

function buildTooltip(person: Person, branchColor: string): string {
  const years = [];
  if (person.birthDate) years.push(`né${person.gender === 'F' ? 'e' : ''} ${person.birthDate.split('-')[0]}`);
  if (person.deathDate) years.push(`décédé${person.gender === 'F' ? 'e' : ''} ${person.deathDate.split('-')[0]}`);
  const yearStr = years.join(' — ');

  return `
    <div style="
      background: #1e1e28;
      border: 1px solid #2a2a3a;
      border-radius: 8px;
      padding: 12px;
      min-width: 180px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, ${branchColor}, #b87333);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: #0a0a0f;
          font-family: 'JetBrains Mono', monospace;
        ">
          ${person.firstName[0]}${person.lastName[0]}
        </div>
        <div>
          <p style="margin:0;font-size:13px;font-weight:600;color:#e8e6e1;font-family:'Inter',sans-serif;">
            ${person.firstName} ${person.lastName}
          </p>
          <p style="margin:0;font-size:10px;color:#8a8894;font-family:'JetBrains Mono',monospace;">
            ${yearStr}
          </p>
        </div>
      </div>
      ${person.occupation ? `<p style="margin:4px 0 0;font-size:11px;color:#c9a84c;">${person.occupation}</p>` : ''}
      ${person.birthPlace ? `<p style="margin:2px 0 0;font-size:10px;color:#5a5864;">${person.birthPlace}</p>` : ''}
    </div>
  `;
}

function isEdgeOnPath(edge: Relation, path: string[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (
      (edge.from === a && edge.to === b) ||
      (edge.from === b && edge.to === a)
    ) {
      return true;
    }
  }
  return false;
}
