export type Gender = 'M' | 'F';

export type RelationType = 'parent' | 'alliance' | 'witness' | 'godparent' | 'adoption' | 'tutelle';

export type LayoutDirection = 'UD' | 'DU' | 'LR' | 'RL';

export type HierarchyFocus = 'all' | 'ancestors' | 'descendants';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  notes?: string;
  branch?: string;
  generation?: number;
}

export interface Relation {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  label?: string;
  source?: string;
}

export interface Source {
  id: string;
  title: string;
  type: 'birth' | 'death' | 'marriage' | 'census' | 'photo' | 'other';
  date?: string;
  reference?: string;
  personId: string;
}

export interface Branch {
  id: string;
  name: string;
  color: string;
  nodeCount: number;
  hubNodeId?: string;
}

export interface TreeData {
  persons: Person[];
  relations: Relation[];
  sources: Source[];
  branches: Branch[];
  treeName: string;
}

export type ViewMode = 'tree' | 'report' | 'data' | 'relations' | 'analytics';
