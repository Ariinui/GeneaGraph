import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Person, Relation, Source, Branch, ViewMode, RelationType, LayoutDirection, HierarchyFocus } from '@/types/genealogy';
import { getSampleData, BRANCH_COLORS } from '@/data/sampleData';
import type { ParsedPerson, ParsedRelation } from '@/utils/gedcomParser';
import { appwriteService } from '@/services/appwriteService';
import { computeBetweenness } from '@/utils/betweenness';

const STORAGE_KEY = 'geneagraph:tree';
const STORAGE_VERSION = 1;
const CLOUD_ENABLED_KEY = 'geneagraph:cloudEnabled';
const LAYOUT_MODE_KEY = 'geneagraph:layoutMode';
const LAYOUT_DIRECTION_KEY = 'geneagraph:layoutDirection';

const APPWRITE_CONFIGURED = import.meta.env.VITE_APPWRITE_PROJECT_ID && 
                             import.meta.env.VITE_APPWRITE_PROJECT_ID !== 'your-project-id-here';

function buildPersonsWithBranches(persons: Person[], relations: Relation[]): Person[] {
  const branchMap = new Map<string, string>();
  const adj: Map<string, Set<string>> = new Map();
  for (const p of persons) adj.set(p.id, new Set());
  for (const r of relations) {
    if (r.type === 'parent' || r.type === 'alliance') {
      adj.get(r.from)?.add(r.to);
      adj.get(r.to)?.add(r.from);
    }
  }
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
  communities.forEach((community, idx) => {
    if (community.length >= 3) {
      for (const pid of community) branchMap.set(pid, `branch-${idx}`);
    }
  });
  return persons.map(p => ({ ...p, branch: branchMap.get(p.id) }));
}

function getInitialTree(): { persons: Person[]; relations: Relation[] } {
  const sd = getSampleData();
  const fallback = buildPersonsWithBranches(sd.persons, sd.relations);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === STORAGE_VERSION) {
        return { persons: parsed.persons ?? fallback, relations: parsed.relations ?? sd.relations };
      }
    }
  } catch {
    console.error('[GeneaGraph] localStorage read error');
  }
  return { persons: fallback, relations: sd.relations };
}

interface AppState {
  persons: Person[];
  relations: Relation[];
  sources: Source[];
  branches: Branch[];
  treeName: string;
  selectedPersonId: string | null;
  viewMode: ViewMode;
  layoutMode: 'physics' | 'hierarchical';
  layoutDirection: LayoutDirection;
  hierarchyFocus: HierarchyFocus;
  hierarchyRootId: string | null;
  generationDepth: number;
  activeFilters: RelationType[];
  activeBranchFilters: string[];
  hoveredPersonId: string | null;
  searchQuery: string;
  panelOpen: boolean;
  highlightedPath: string[] | null;
  cloudEnabled: boolean;
  cloudSyncing: boolean;
  cloudError: string | null;
  yearRange: [number, number] | null;
  showPivots: boolean;
  betweennessMap: Map<string, number>;
}

interface AppContextType extends AppState {
  setSelectedPersonId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLayoutMode: (mode: 'physics' | 'hierarchical') => void;
  setLayoutDirection: (dir: LayoutDirection) => void;
  setHierarchyFocus: (focus: HierarchyFocus) => void;
  setHierarchyRootId: (id: string | null) => void;
  setGenerationDepth: (depth: number) => void;
  toggleRelationFilter: (type: RelationType) => void;
  toggleBranchFilter: (branchId: string) => void;
  setHoveredPersonId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setHighlightedPath: (path: string[] | null) => void;
  addPerson: (person: Omit<Person, 'id'>) => string;
  addRelation: (relation: Omit<Relation, 'id'>) => void;
  getPersonRelations: (personId: string) => Relation[];
  getPersonSources: (personId: string) => Source[];
  getConnectedPersons: (personId: string) => { person: Person; relation: Relation }[];
  getShortestPath: (from: string, to: string) => string[];
  getAncestors: (personId: string, maxDepth?: number) => string[];
  getDescendants: (personId: string, maxDepth?: number) => string[];
  resetTree: () => void;
  updatePerson: (id: string, updates: Partial<Omit<Person, 'id'>>) => void;
  deletePerson: (id: string) => void;
  deleteRelation: (id: string) => void;
  clearAll: () => void;
  deleteBranch: (branchId: string) => void;
  importData: (persons: ParsedPerson[], relations: ParsedRelation[], mode: 'replace' | 'merge') => void;
  toggleCloudSync: () => void;
  syncWithCloud: () => Promise<void>;
  setYearRange: (range: [number, number] | null) => void;
  toggleShowPivots: () => void;
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

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [layoutMode, setLayoutModeState] = useState<'physics' | 'hierarchical'>(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_MODE_KEY);
      return stored === 'hierarchical' ? 'hierarchical' : 'physics';
    } catch { return 'physics'; }
  });
  const [layoutDirection, setLayoutDirectionState] = useState<LayoutDirection>(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_DIRECTION_KEY) as LayoutDirection | null;
      return stored || 'UD';
    } catch { return 'UD'; }
  });
  const [hierarchyFocus, setHierarchyFocus] = useState<HierarchyFocus>('all');
  const [hierarchyRootId, setHierarchyRootId] = useState<string | null>(null);
  const [generationDepth, setGenerationDepth] = useState<number>(10);
  const [activeFilters, setActiveFilters] = useState<RelationType[]>(['parent', 'alliance', 'witness', 'godparent', 'adoption', 'tutelle']);
  const [activeBranchFilters, setActiveBranchFilters] = useState<string[]>([]);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<string[] | null>(null);
  
  const storedCloud = localStorage.getItem(CLOUD_ENABLED_KEY);
  const initialCloudEnabled = APPWRITE_CONFIGURED && storedCloud !== 'false';
  const [cloudEnabled, setCloudEnabled] = useState(initialCloudEnabled);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const [persons, setPersons] = useState<Person[]>(() => getInitialTree().persons);
  const [relations, setRelations] = useState<Relation[]>(() => getInitialTree().relations);

  const personsRef = useRef(persons);
  const relationsRef = useRef(relations);
  useEffect(() => { personsRef.current = persons; }, [persons]);
  useEffect(() => { relationsRef.current = relations; }, [relations]);

  const [yearRange, setYearRange] = useState<[number, number] | null>(null);
  const [showPivots, setShowPivots] = useState(false);
  const toggleShowPivots = useCallback(() => setShowPivots(p => !p), []);

  const branches = useMemo(() => detectBranches(persons, relations), [persons, relations]);

  const betweennessMap = useMemo(() => {
    if (!showPivots) return new Map<string, number>();
    return computeBetweenness(persons.map(p => p.id), relations);
  }, [showPivots, persons, relations]);

  const deleteBranch = useCallback((branchId: string) => {
    const ids = persons.filter(p => p.branch === branchId).map(p => p.id);
    setPersons(prev => prev.filter(p => !ids.includes(p.id)));
    setRelations(prev => prev.filter(r => !ids.includes(r.from) && !ids.includes(r.to)));
  }, [persons]);

  useEffect(() => {
    setActiveBranchFilters(prev => {
      const newIds = branches.map(b => b.id).filter(id => !prev.includes(id));
      return newIds.length ? [...prev, ...newIds] : prev;
    });
  }, [branches]);

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

  const setLayoutMode = useCallback((mode: 'physics' | 'hierarchical') => {
    setLayoutModeState(mode);
    try { localStorage.setItem(LAYOUT_MODE_KEY, mode); } catch {}
  }, []);

  const setLayoutDirection = useCallback((dir: LayoutDirection) => {
    setLayoutDirectionState(dir);
    try { localStorage.setItem(LAYOUT_DIRECTION_KEY, dir); } catch {}
  }, []);

  const togglePanel = useCallback(() => setPanelOpen((p) => !p), []);

  const addPerson = useCallback((person: Omit<Person, 'id'>): string => {
    const id = `p-${Date.now()}`;
    const newPerson = { ...person, id };
    setPersons((prev) => [...prev, newPerson]);
    if (cloudEnabled) {
      appwriteService.addPerson(newPerson);
    }
    return id;
  }, [cloudEnabled]);

  const addRelation = useCallback((relation: Omit<Relation, 'id'>) => {
    const id = `r-${Date.now()}`;
    const newRelation = { ...relation, id };
    setRelations((prev) => [...prev, newRelation]);
    if (cloudEnabled) {
      appwriteService.addRelation(newRelation);
    }
  }, [cloudEnabled]);

  const updatePerson = useCallback((id: string, updates: Partial<Omit<Person, 'id'>>) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (cloudEnabled) {
      appwriteService.updatePerson(id, updates);
    }
  }, [cloudEnabled]);

  const deletePerson = useCallback((id: string) => {
    setPersons(prev => prev.filter(p => p.id !== id));
    setRelations(prev => prev.filter(r => r.from !== id && r.to !== id));
    if (cloudEnabled) {
      appwriteService.deletePerson(id);
      appwriteService.deleteRelationsForPerson(id);
    }
  }, [cloudEnabled]);

  const deleteRelation = useCallback((id: string) => {
    setRelations(prev => prev.filter(r => r.id !== id));
    if (cloudEnabled) {
      appwriteService.deleteRelation(id);
    }
  }, [cloudEnabled]);

  const toggleCloudSync = useCallback(() => {
    const newEnabled = !cloudEnabled;
    setCloudEnabled(newEnabled);
    localStorage.setItem(CLOUD_ENABLED_KEY, String(newEnabled));
    setCloudError(null);
  }, [cloudEnabled]);

  const syncWithCloud = useCallback(async () => {
    if (!APPWRITE_CONFIGURED) {
      setCloudError('Appwrite non configuré. Vérifiez vos variables d\'environnement.');
      return;
    }

    setCloudSyncing(true);
    setCloudError(null);

    try {
      const data = await appwriteService.loadData();
      if (data.persons.length > 0 || data.relations.length > 0) {
        // Appwrite has data → load it (mobile gets PC's data)
        setPersons(buildPersonsWithBranches(data.persons, data.relations));
        setRelations(data.relations);
      } else {
        // Appwrite is empty → upload localStorage data if any
        if (personsRef.current.length > 0) {
          await appwriteService.syncAll(personsRef.current, relationsRef.current);
        }
      }
    } catch (error) {
      setCloudError('Erreur de synchronisation avec le cloud');
      console.error('Cloud sync error:', error);
    } finally {
      setCloudSyncing(false);
    }
  }, []);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (cloudEnabled && APPWRITE_CONFIGURED && !initialized) {
      syncWithCloud().then(() => setInitialized(true));
    }
  }, [cloudEnabled, initialized, syncWithCloud]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPersons([]);
    setRelations([]);
    if (cloudEnabled) {
      appwriteService.clearAll();
    }
  }, [cloudEnabled]);

  const importData = useCallback((
    rawPersons: ParsedPerson[],
    rawRelations: ParsedRelation[],
    mode: 'replace' | 'merge'
  ) => {
    const now = Date.now();
    const idMap = new Map<string, string>();

    const newPersons: Person[] = rawPersons.map((p, i) => {
      const id = `p-${now}-${i}`;
      idMap.set(p._gedId, id);
      const { _gedId, ...rest } = p;
      return { ...rest, id };
    });

    const newRelations: Relation[] = rawRelations
      .filter(r => idMap.has(r.from) && idMap.has(r.to))
      .map((r, i) => ({
        id: `r-${now}-${i}`,
        from: idMap.get(r.from)!,
        to: idMap.get(r.to)!,
        type: r.type,
      }));

    if (mode === 'replace') {
      const merged = buildPersonsWithBranches(newPersons, newRelations);
      setPersons(merged);
      setRelations(newRelations);
    } else {
      setPersons(prev => {
        const all = [...prev, ...newPersons];
        return buildPersonsWithBranches(all, [...relations, ...newRelations]);
      });
      setRelations(prev => [...prev, ...newRelations]);
    }
  }, [relations]);

  const resetTree = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const sd = getSampleData();
    setPersons(buildPersonsWithBranches(sd.persons, sd.relations));
    setRelations(sd.relations);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, persons, relations }));
      } catch {
        console.error('[GeneaGraph] localStorage write error');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [persons, relations]);

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

  const getAncestors = useCallback(
    (personId: string, maxDepth: number = 10): string[] => {
      const ancestors: string[] = [personId];
      const visited = new Set<string>([personId]);
      const queue: [string, number][] = [[personId, 0]];
      
      while (queue.length > 0) {
        const [curr, depth] = queue.shift()!;
        if (depth >= maxDepth) continue;
        
        const parents = relations
          .filter(r => r.type === 'parent' && r.to === curr)
          .map(r => r.from);
        
        for (const parent of parents) {
          if (!visited.has(parent)) {
            visited.add(parent);
            ancestors.push(parent);
            queue.push([parent, depth + 1]);
          }
        }
      }
      
      return ancestors;
    },
    [relations]
  );

  const getDescendants = useCallback(
    (personId: string, maxDepth: number = 10): string[] => {
      const descendants: string[] = [personId];
      const visited = new Set<string>([personId]);
      const queue: [string, number][] = [[personId, 0]];
      
      while (queue.length > 0) {
        const [curr, depth] = queue.shift()!;
        if (depth >= maxDepth) continue;
        
        const children = relations
          .filter(r => r.type === 'parent' && r.from === curr)
          .map(r => r.to);
        
        for (const child of children) {
          if (!visited.has(child)) {
            visited.add(child);
            descendants.push(child);
            queue.push([child, depth + 1]);
          }
        }
      }
      
      return descendants;
    },
    [relations]
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
    layoutDirection,
    hierarchyFocus,
    hierarchyRootId,
    generationDepth,
    activeFilters,
    activeBranchFilters,
    hoveredPersonId,
    searchQuery,
    panelOpen,
    highlightedPath,
    cloudEnabled,
    cloudSyncing,
    cloudError,
    setSelectedPersonId,
    setViewMode,
    setLayoutMode,
    setLayoutDirection,
    setHierarchyFocus,
    setHierarchyRootId,
    setGenerationDepth,
    toggleRelationFilter,
    toggleBranchFilter,
    setHoveredPersonId,
    setSearchQuery,
    togglePanel,
    setPanelOpen,
    setHighlightedPath,
    addPerson,
    addRelation,
    getPersonRelations,
    getPersonSources,
    getConnectedPersons,
    getShortestPath,
    getAncestors,
    getDescendants,
    resetTree,
    updatePerson,
    deletePerson,
    deleteRelation,
    clearAll,
    deleteBranch,
    importData,
    toggleCloudSync,
    syncWithCloud,
    yearRange,
    setYearRange,
    showPivots,
    betweennessMap,
    toggleShowPivots,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
