import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Person, Relation, Source, Branch, ViewMode, RelationType } from '@/types/genealogy';
import { getSampleData, BRANCH_COLORS } from '@/data/sampleData';

interface AppState {
  persons: Person[];
  relations: Relation[];
  sources: Source[];
  branches: Branch[];
  treeName: string;
  selectedPersonId: string | null;
  viewMode: ViewMode;
  layoutMode: 'physics' | 'hierarchical';
  activeFilters: RelationType[];
  activeBranchFilters: string[];
  hoveredPersonId: string | null;
  searchQuery: string;
  panelOpen: boolean;
  highlightedPath: string[] | null;
}

interface AppContextType extends AppState {
  setSelectedPersonId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLayoutMode: (mode: 'physics' | 'hierarchical') => void;
  toggleRelationFilter: (type: RelationType) => void;
  toggleBranchFilter: (branchId: string) => void;
  setHoveredPersonId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  togglePanel: () => void;
  setHighlightedPath: (path: string[] | null) => void;
  addPerson: (person: Omit<Person, 'id'>) => void;
  addRelation: (relation: Omit<Relation, 'id'>) => void;
  getPersonRelations: (personId: string) => Relation[];
  getPersonSources: (personId: string) => Source[];
  getConnectedPersons: (personId: string) => { person: Person; relation: Relation }[];
  getShortestPath: (from: string, to: string) => string[];
}

const AppContext = createContext<AppContextType | null>(null);

function detectBranches(persons: Person[], relations: Relation[]): Branch[] {
  // Build adjacency list for alliance + parent relations
  const adj: Map<string, Set<string>> = new Map();
  for (const p of persons) {
    adj.set(p.id, new Set());
  }
  for (const r of relations) {
    if (r.type === 'parent' || r.type === 'alliance') {
      adj.get(r.from)?.add(r.to);
      adj.get(r.to)?.add(r.from);
    }
  }

  // Greedy community detection
  const visited = new Set<string>();
  const communities: string[][] = [];

  for (const person of persons) {
    if (visited.has(person.id)) continue;
    const community: string[] = [];
    const stack = [person.id];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      community.push(curr);
      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
    communities.push(community);
  }

  // Filter small communities and name branches
  const branches: Branch[] = communities
    .filter((c) => c.length >= 3)
    .map((community, idx) => {
      // Find hub (most connected)
      let hubId = community[0];
      let maxDegree = 0;
      for (const pid of community) {
        const degree = relations.filter(
          (r) => (r.from === pid || r.to === pid) && (r.type === 'parent' || r.type === 'alliance')
        ).length;
        if (degree > maxDegree) {
          maxDegree = degree;
          hubId = pid;
        }
      }
      const hub = persons.find((p) => p.id === hubId);
      const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];

      return {
        id: `branch-${idx}`,
        name: hub ? `Branche ${hub.lastName}` : `Branche ${idx + 1}`,
        color,
        nodeCount: community.length,
        hubNodeId: hubId,
      };
    });

  // Assign branch to each person
  const personBranchMap = new Map<string, string>();
  communities.forEach((community, idx) => {
    if (community.length >= 3) {
      const branchId = `branch-${idx}`;
      for (const pid of community) {
        personBranchMap.set(pid, branchId);
      }
    }
  });

  return branches;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const sampleData = useMemo(() => getSampleData(), []);
  const branches = useMemo(() => detectBranches(sampleData.persons, sampleData.relations), [sampleData]);

  // Assign branches to persons
  const personsWithBranches = useMemo(() => {
    const branchMap = new Map<string, string>();
    // Recompute community membership
    const adj: Map<string, Set<string>> = new Map();
    for (const p of sampleData.persons) {
      adj.set(p.id, new Set());
    }
    for (const r of sampleData.relations) {
      if (r.type === 'parent' || r.type === 'alliance') {
        adj.get(r.from)?.add(r.to);
        adj.get(r.to)?.add(r.from);
      }
    }
    const visited = new Set<string>();
    const communities: string[][] = [];
    for (const person of sampleData.persons) {
      if (visited.has(person.id)) continue;
      const community: string[] = [];
      const stack = [person.id];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        community.push(curr);
        for (const neighbor of adj.get(curr) || []) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
      communities.push(community);
    }
    communities.forEach((community, idx) => {
      if (community.length >= 3) {
        for (const pid of community) {
          branchMap.set(pid, `branch-${idx}`);
        }
      }
    });
    return sampleData.persons.map((p) => ({
      ...p,
      branch: branchMap.get(p.id),
    }));
  }, [sampleData]);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [layoutMode, setLayoutMode] = useState<'physics' | 'hierarchical'>('physics');
  const [activeFilters, setActiveFilters] = useState<RelationType[]>(['parent', 'alliance', 'witness', 'godparent']);
  const [activeBranchFilters, setActiveBranchFilters] = useState<string[]>(branches.map((b) => b.id));
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [highlightedPath, setHighlightedPath] = useState<string[] | null>(null);
  const [persons, setPersons] = useState<Person[]>(personsWithBranches);
  const [relations, setRelations] = useState<Relation[]>(sampleData.relations);

  const toggleRelationFilter = useCallback((type: RelationType) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const toggleBranchFilter = useCallback((branchId: string) => {
    setActiveBranchFilters((prev) =>
      prev.includes(branchId) ? prev.filter((b) => b !== branchId) : [...prev, branchId]
    );
  }, []);

  const togglePanel = useCallback(() => setPanelOpen((p) => !p), []);

  const addPerson = useCallback((person: Omit<Person, 'id'>) => {
    const newPerson = { ...person, id: `p-${Date.now()}` };
    setPersons((prev) => [...prev, newPerson]);
  }, []);

  const addRelation = useCallback((relation: Omit<Relation, 'id'>) => {
    const newRelation = { ...relation, id: `r-${Date.now()}` };
    setRelations((prev) => [...prev, newRelation]);
  }, []);

  const getPersonRelations = useCallback(
    (personId: string) => {
      return relations.filter((r) => r.from === personId || r.to === personId);
    },
    [relations]
  );

  const getPersonSources = useCallback(
    (personId: string) => {
      return sampleData.sources.filter((s) => s.personId === personId);
    },
    [sampleData.sources]
  );

  const getConnectedPersons = useCallback(
    (personId: string) => {
      const rels = relations.filter((r) => r.from === personId || r.to === personId);
      return rels
        .map((r) => {
          const otherId = r.from === personId ? r.to : r.from;
          const person = persons.find((p) => p.id === otherId);
          return person ? { person, relation: r } : null;
        })
        .filter(Boolean) as { person: Person; relation: Relation }[];
    },
    [relations, persons]
  );

  const getShortestPath = useCallback(
    (from: string, to: string): string[] => {
      if (from === to) return [from];
      const adj: Map<string, string[]> = new Map();
      for (const p of persons) {
        adj.set(p.id, []);
      }
      for (const r of relations) {
        if (r.type === 'parent' || r.type === 'alliance') {
          adj.get(r.from)?.push(r.to);
          adj.get(r.to)?.push(r.from);
        }
      }
      const queue: [string, string[]][] = [[from, [from]]];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const [curr, path] = queue.shift()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        for (const neighbor of adj.get(curr) || []) {
          if (neighbor === to) return [...path, neighbor];
          if (!visited.has(neighbor)) {
            queue.push([neighbor, [...path, neighbor]]);
          }
        }
      }
      return [];
    },
    [persons, relations]
  );

  const value: AppContextType = {
    persons,
    relations,
    sources: sampleData.sources,
    branches,
    treeName: sampleData.treeName,
    selectedPersonId,
    viewMode,
    layoutMode,
    activeFilters,
    activeBranchFilters,
    hoveredPersonId,
    searchQuery,
    panelOpen,
    highlightedPath,
    setSelectedPersonId,
    setViewMode,
    setLayoutMode,
    toggleRelationFilter,
    toggleBranchFilter,
    setHoveredPersonId,
    setSearchQuery,
    togglePanel,
    setHighlightedPath,
    addPerson,
    addRelation,
    getPersonRelations,
    getPersonSources,
    getConnectedPersons,
    getShortestPath,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
