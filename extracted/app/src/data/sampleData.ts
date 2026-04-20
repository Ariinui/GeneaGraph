import type { TreeData, Person, Relation, Source } from '@/types/genealogy';

// ============ GENERATION 1 (born ~1850-1880) ============
const jean_dupont: Person = {
  id: 'p1',
  firstName: 'Jean',
  lastName: 'Dupont',
  gender: 'M',
  birthDate: '1852-03-15',
  birthPlace: 'Lyon, Rhône',
  deathDate: '1921-07-22',
  deathPlace: 'Lyon, Rhône',
  occupation: 'Cultivateur',
  generation: 1,
};

const marie_martin: Person = {
  id: 'p2',
  firstName: 'Marie',
  lastName: 'Martin',
  gender: 'F',
  birthDate: '1856-11-08',
  birthPlace: 'Villefranche-sur-Saône, Rhône',
  deathDate: '1930-04-14',
  deathPlace: 'Lyon, Rhône',
  occupation: 'Couturière',
  generation: 1,
};

const pierre_bernard: Person = {
  id: 'p3',
  firstName: 'Pierre',
  lastName: 'Bernard',
  gender: 'M',
  birthDate: '1848-06-22',
  birthPlace: 'Marseille, Bouches-du-Rhône',
  deathDate: '1915-01-10',
  deathPlace: 'Marseille, Bouches-du-Rhône',
  occupation: 'Marchand de vin',
  generation: 1,
};

const sophie_petit: Person = {
  id: 'p4',
  firstName: 'Sophie',
  lastName: 'Petit',
  gender: 'F',
  birthDate: '1851-09-03',
  birthPlace: 'Aix-en-Provence, Bouches-du-Rhône',
  deathDate: '1918-12-25',
  deathPlace: 'Marseille, Bouches-du-Rhône',
  generation: 1,
};

const louis_moreau: Person = {
  id: 'p5',
  firstName: 'Louis',
  lastName: 'Moreau',
  gender: 'M',
  birthDate: '1850-01-17',
  birthPlace: 'Nantes, Loire-Atlantique',
  deathDate: '1912-08-05',
  deathPlace: 'Nantes, Loire-Atlantique',
  occupation: 'Charpentier',
  generation: 1,
};

const claire_richard: Person = {
  id: 'p6',
  firstName: 'Claire',
  lastName: 'Richard',
  gender: 'F',
  birthDate: '1854-04-29',
  birthPlace: 'Saint-Nazaire, Loire-Atlantique',
  deathDate: '1925-06-18',
  deathPlace: 'Nantes, Loire-Atlantique',
  generation: 1,
};

// ============ GENERATION 2 (born ~1875-1905) ============
const henri_dupont: Person = {
  id: 'p7',
  firstName: 'Henri',
  lastName: 'Dupont',
  gender: 'M',
  birthDate: '1878-05-20',
  birthPlace: 'Lyon, Rhône',
  deathDate: '1945-09-12',
  deathPlace: 'Lyon, Rhône',
  occupation: 'Instituteur',
  generation: 2,
};

const marguerite_bernard: Person = {
  id: 'p8',
  firstName: 'Marguerite',
  lastName: 'Bernard',
  gender: 'F',
  birthDate: '1880-02-14',
  birthPlace: 'Marseille, Bouches-du-Rhône',
  deathDate: '1952-11-30',
  deathPlace: 'Lyon, Rhône',
  occupation: 'Institutrice',
  generation: 2,
};

const paul_dupont: Person = {
  id: 'p9',
  firstName: 'Paul',
  lastName: 'Dupont',
  gender: 'M',
  birthDate: '1882-08-03',
  birthPlace: 'Lyon, Rhône',
  deathDate: '1960-03-25',
  deathPlace: 'Paris, Seine',
  occupation: 'Comptable',
  generation: 2,
};

const jeanne_leroy: Person = {
  id: 'p10',
  firstName: 'Jeanne',
  lastName: 'Leroy',
  gender: 'F',
  birthDate: '1885-12-01',
  birthPlace: 'Paris, Seine',
  deathDate: '1965-07-08',
  deathPlace: 'Paris, Seine',
  occupation: 'Couturière',
  generation: 2,
};

const antoine_bernard: Person = {
  id: 'p11',
  firstName: 'Antoine',
  lastName: 'Bernard',
  gender: 'M',
  birthDate: '1876-09-18',
  birthPlace: 'Marseille, Bouches-du-Rhône',
  deathDate: '1942-05-04',
  deathPlace: 'Marseille, Bouches-du-Rhône',
  occupation: 'Négociant',
  generation: 2,
};

const isabelle_dubois: Person = {
  id: 'p12',
  firstName: 'Isabelle',
  lastName: 'Dubois',
  gender: 'F',
  birthDate: '1880-06-10',
  birthPlace: 'Aix-en-Provence, Bouches-du-Rhône',
  deathDate: '1958-02-20',
  deathPlace: 'Marseille, Bouches-du-Rhône',
  generation: 2,
};

const simon_moreau: Person = {
  id: 'p13',
  firstName: 'Simon',
  lastName: 'Moreau',
  gender: 'M',
  birthDate: '1879-03-22',
  birthPlace: 'Nantes, Loire-Atlantique',
  deathDate: '1948-10-15',
  deathPlace: 'Bordeaux, Gironde',
  occupation: 'Armateur',
  generation: 2,
};

const camille_fournier: Person = {
  id: 'p14',
  firstName: 'Camille',
  lastName: 'Fournier',
  gender: 'F',
  birthDate: '1883-07-07',
  birthPlace: 'Bordeaux, Gironde',
  deathDate: '1962-04-02',
  deathPlace: 'Bordeaux, Gironde',
  generation: 2,
};

const lucie_dupont: Person = {
  id: 'p15',
  firstName: 'Lucie',
  lastName: 'Dupont',
  gender: 'F',
  birthDate: '1884-11-25',
  birthPlace: 'Lyon, Rhône',
  deathDate: '1970-01-16',
  deathPlace: 'Lyon, Rhône',
  generation: 2,
};

const gustave_roux: Person = {
  id: 'p16',
  firstName: 'Gustave',
  lastName: 'Roux',
  gender: 'M',
  birthDate: '1881-04-14',
  birthPlace: 'Lyon, Rhône',
  deathDate: '1955-08-28',
  deathPlace: 'Lyon, Rhône',
  occupation: 'Boulanger',
  generation: 2,
};

// ============ GENERATION 3 (born ~1900-1930) ============
const jacques_dupont: Person = {
  id: 'p17',
  firstName: 'Jacques',
  lastName: 'Dupont',
  gender: 'M',
  birthDate: '1905-06-12',
  birthPlace: 'Lyon, Rhône',
  deathDate: '1982-03-18',
  deathPlace: 'Lyon, Rhône',
  occupation: 'Médecin',
  generation: 3,
};

const suzanne_bernard: Person = {
  id: 'p18',
  firstName: 'Suzanne',
  lastName: 'Bernard',
  gender: 'F',
  birthDate: '1908-09-05',
  birthPlace: 'Marseille, Bouches-du-Rhône',
  deathDate: '1995-12-22',
  deathPlace: 'Lyon, Rhône',
  generation: 3,
};

const françois_dupont: Person = {
  id: 'p19',
  firstName: 'François',
  lastName: 'Dupont',
  gender: 'M',
  birthDate: '1910-01-30',
  birthPlace: 'Paris, Seine',
  deathDate: '1988-07-14',
  deathPlace: 'Paris, Seine',
  occupation: 'Ingénieur',
  generation: 3,
};

const madeleine_girard: Person = {
  id: 'p20',
  firstName: 'Madeleine',
  lastName: 'Girard',
  gender: 'F',
  birthDate: '1912-04-18',
  birthPlace: 'Paris, Seine',
  deathDate: '2000-10-03',
  deathPlace: 'Paris, Seine',
  generation: 3,
};

const rené_moreau: Person = {
  id: 'p21',
  firstName: 'René',
  lastName: 'Moreau',
  gender: 'M',
  birthDate: '1902-08-22',
  birthPlace: 'Bordeaux, Gironde',
  deathDate: '1975-05-11',
  deathPlace: 'Bordeaux, Gironde',
  occupation: 'Avocat',
  generation: 3,
};

const yvonne_dupont: Person = {
  id: 'p22',
  firstName: 'Yvonne',
  lastName: 'Dupont',
  gender: 'F',
  birthDate: '1907-03-08',
  birthPlace: 'Lyon, Rhône',
  deathDate: '1990-09-29',
  deathPlace: 'Bordeaux, Gironde',
  generation: 3,
};

const marcel_blanc: Person = {
  id: 'p23',
  firstName: 'Marcel',
  lastName: 'Blanc',
  gender: 'M',
  birthDate: '1915-11-12',
  birthPlace: 'Marseille, Bouches-du-Rhône',
  deathDate: '1998-06-20',
  deathPlace: 'Marseille, Bouches-du-Rhône',
  occupation: 'Capitaine de pêche',
  generation: 3,
};

const simone_bernard: Person = {
  id: 'p24',
  firstName: 'Simone',
  lastName: 'Bernard',
  gender: 'F',
  birthDate: '1918-02-28',
  birthPlace: 'Marseille, Bouches-du-Rhône',
  deathDate: '2005-08-15',
  deathPlace: 'Marseille, Bouches-du-Rhône',
  generation: 3,
};

// ============ GENERATION 4 (born ~1930-1970) ============
const philippe_dupont: Person = {
  id: 'p25',
  firstName: 'Philippe',
  lastName: 'Dupont',
  gender: 'M',
  birthDate: '1938-05-15',
  birthPlace: 'Lyon, Rhône',
  occupation: 'Professeur universitaire',
  generation: 4,
};

const nathalie_rey: Person = {
  id: 'p26',
  firstName: 'Nathalie',
  lastName: 'Rey',
  gender: 'F',
  birthDate: '1942-08-22',
  birthPlace: 'Lyon, Rhône',
  occupation: 'Pharmacienne',
  generation: 4,
};

const thomas_dupont: Person = {
  id: 'p27',
  firstName: 'Thomas',
  lastName: 'Dupont',
  gender: 'M',
  birthDate: '1945-11-03',
  birthPlace: 'Paris, Seine',
  occupation: 'Architecte',
  generation: 4,
};

const catherine_lambert: Person = {
  id: 'p28',
  firstName: 'Catherine',
  lastName: 'Lambert',
  gender: 'F',
  birthDate: '1948-02-14',
  birthPlace: 'Paris, Seine',
  occupation: 'Journaliste',
  generation: 4,
};

const persons: Person[] = [
  jean_dupont, marie_martin, pierre_bernard, sophie_petit, louis_moreau, claire_richard,
  henri_dupont, marguerite_bernard, paul_dupont, jeanne_leroy, antoine_bernard, isabelle_dubois,
  simon_moreau, camille_fournier, lucie_dupont, gustave_roux,
  jacques_dupont, suzanne_bernard, françois_dupont, madeleine_girard,
  rené_moreau, yvonne_dupont, marcel_blanc, simone_bernard,
  philippe_dupont, nathalie_rey, thomas_dupont, catherine_lambert,
];

// ============ RELATIONS ============

const relations: Relation[] = [
  // G1: Jean Dupont + Marie Martin → enfants
  { id: 'r1', from: 'p1', to: 'p2', type: 'alliance', label: 'Mariage 1875', source: 'Acte de mariage Lyon 1875' },
  { id: 'r2', from: 'p1', to: 'p7', type: 'parent', label: 'Père' },
  { id: 'r3', from: 'p2', to: 'p7', type: 'parent', label: 'Mère' },
  { id: 'r4', from: 'p1', to: 'p9', type: 'parent', label: 'Père' },
  { id: 'r5', from: 'p2', to: 'p9', type: 'parent', label: 'Mère' },
  { id: 'r6', from: 'p1', to: 'p15', type: 'parent', label: 'Père' },
  { id: 'r7', from: 'p2', to: 'p15', type: 'parent', label: 'Mère' },

  // G1: Pierre Bernard + Sophie Petit → enfants
  { id: 'r8', from: 'p3', to: 'p4', type: 'alliance', label: 'Mariage 1874', source: 'Acte de mariage Marseille 1874' },
  { id: 'r9', from: 'p3', to: 'p8', type: 'parent', label: 'Père' },
  { id: 'r10', from: 'p4', to: 'p8', type: 'parent', label: 'Mère' },
  { id: 'r11', from: 'p3', to: 'p11', type: 'parent', label: 'Père' },
  { id: 'r12', from: 'p4', to: 'p11', type: 'parent', label: 'Mère' },

  // G1: Louis Moreau + Claire Richard → enfants
  { id: 'r13', from: 'p5', to: 'p6', type: 'alliance', label: 'Mariage 1874', source: 'Acte de mariage Nantes 1874' },
  { id: 'r14', from: 'p5', to: 'p13', type: 'parent', label: 'Père' },
  { id: 'r15', from: 'p6', to: 'p13', type: 'parent', label: 'Mère' },

  // Témoins de mariage
  { id: 'r16', from: 'p5', to: 'r1', type: 'witness', label: 'Témoin mariage' },
  { id: 'r17', from: 'p16', to: 'r8', type: 'witness', label: 'Témoin mariage' },

  // G2: Henri Dupont + Marguerite Bernard → enfants
  { id: 'r18', from: 'p7', to: 'p8', type: 'alliance', label: 'Mariage 1902', source: 'Acte de mariage Lyon 1902' },
  { id: 'r19', from: 'p7', to: 'p17', type: 'parent', label: 'Père' },
  { id: 'r20', from: 'p8', to: 'p17', type: 'parent', label: 'Mère' },
  { id: 'r21', from: 'p7', to: 'p22', type: 'parent', label: 'Père' },
  { id: 'r22', from: 'p8', to: 'p22', type: 'parent', label: 'Mère' },

  // G2: Paul Dupont + Jeanne Leroy → enfants
  { id: 'r23', from: 'p9', to: 'p10', type: 'alliance', label: 'Mariage 1905', source: 'Acte de mariage Paris 1905' },
  { id: 'r24', from: 'p9', to: 'p19', type: 'parent', label: 'Père' },
  { id: 'r25', from: 'p10', to: 'p19', type: 'parent', label: 'Mère' },

  // G2: Antoine Bernard + Isabelle Dubois → enfants
  { id: 'r26', from: 'p11', to: 'p12', type: 'alliance', label: 'Mariage 1901', source: 'Acte de mariage Marseille 1901' },
  { id: 'r27', from: 'p11', to: 'p18', type: 'parent', label: 'Père' },
  { id: 'r28', from: 'p12', to: 'p18', type: 'parent', label: 'Mère' },

  // G2: Simon Moreau + Camille Fournier → enfants
  { id: 'r29', from: 'p13', to: 'p14', type: 'alliance', label: 'Mariage 1900', source: 'Acte de mariage Bordeaux 1900' },
  { id: 'r30', from: 'p13', to: 'p21', type: 'parent', label: 'Père' },
  { id: 'r31', from: 'p14', to: 'p21', type: 'parent', label: 'Mère' },

  // G2: Lucie Dupont + Gustave Roux
  { id: 'r32', from: 'p15', to: 'p16', type: 'alliance', label: 'Mariage 1904' },

  // Parrainages
  { id: 'r33', from: 'p3', to: 'p17', type: 'godparent', label: 'Parrain' },
  { id: 'r34', from: 'p13', to: 'p19', type: 'godparent', label: 'Parrain' },

  // Témoins
  { id: 'r35', from: 'p11', to: 'r18', type: 'witness', label: 'Témoin mariage' },
  { id: 'r36', from: 'p7', to: 'r23', type: 'witness', label: 'Témoin mariage' },
  { id: 'r37', from: 'p21', to: 'r26', type: 'witness', label: 'Témoin mariage' },

  // G3: Jacques Dupont + Suzanne Bernard → enfants
  { id: 'r38', from: 'p17', to: 'p18', type: 'alliance', label: 'Mariage 1930', source: 'Acte de mariage Lyon 1930' },
  { id: 'r39', from: 'p17', to: 'p25', type: 'parent', label: 'Père' },
  { id: 'r40', from: 'p18', to: 'p25', type: 'parent', label: 'Mère' },

  // G3: François Dupont + Madeleine Girard → enfants
  { id: 'r41', from: 'p19', to: 'p20', type: 'alliance', label: 'Mariage 1935', source: 'Acte de mariage Paris 1935' },
  { id: 'r42', from: 'p19', to: 'p27', type: 'parent', label: 'Père' },
  { id: 'r43', from: 'p20', to: 'p27', type: 'parent', label: 'Mère' },

  // G3: René Moreau + Yvonne Dupont
  { id: 'r44', from: 'p21', to: 'p22', type: 'alliance', label: 'Mariage 1928', source: 'Acte de mariage Bordeaux 1928' },

  // G3: Marcel Blanc + Simone Bernard
  { id: 'r45', from: 'p23', to: 'p24', type: 'alliance', label: 'Mariage 1940', source: 'Acte de mariage Marseille 1940' },

  // Témoins supplémentaires
  { id: 'r46', from: 'p19', to: 'r38', type: 'witness', label: 'Témoin mariage' },
  { id: 'r47', from: 'p23', to: 'r44', type: 'witness', label: 'Témoin mariage' },

  // G4: Philippe Dupont + Nathalie Rey
  { id: 'r48', from: 'p25', to: 'p26', type: 'alliance', label: 'Mariage 1965', source: 'Acte de mariage Lyon 1965' },

  // G4: Thomas Dupont + Catherine Lambert
  { id: 'r49', from: 'p27', to: 'p28', type: 'alliance', label: 'Mariage 1970', source: 'Acte de mariage Paris 1970' },

  // Témoins G4
  { id: 'r50', from: 'p21', to: 'r48', type: 'witness', label: 'Témoin mariage' },
  { id: 'r51', from: 'p25', to: 'r49', type: 'witness', label: 'Témoin mariage' },
];

// ============ SOURCES ============
const sources: Source[] = [
  { id: 's1', title: 'Acte de naissance - Jean Dupont', type: 'birth', date: '1852-03-15', reference: 'Lyon Naissances 1852, folio 142', personId: 'p1' },
  { id: 's2', title: 'Acte de mariage - Dupont/Martin', type: 'marriage', date: '1875-06-10', reference: 'Lyon Mariages 1875, acte 89', personId: 'p1' },
  { id: 's3', title: 'Acte de naissance - Henri Dupont', type: 'birth', date: '1878-05-20', reference: 'Lyon Naissances 1878, folio 203', personId: 'p7' },
  { id: 's4', title: 'Recensement 1906 - Famille Dupont', type: 'census', date: '1906', reference: 'Lyon Recensements 1906, quartier Guillotière', personId: 'p7' },
  { id: 's5', title: 'Acte de mariage - Dupont/Bernard', type: 'marriage', date: '1902-04-15', reference: 'Lyon Mariages 1902, acte 156', personId: 'p7' },
  { id: 's6', title: 'Acte de naissance - Jacques Dupont', type: 'birth', date: '1905-06-12', reference: 'Lyon Naissances 1905, folio 312', personId: 'p17' },
  { id: 's7', title: 'Photo de famille - 1930', type: 'photo', date: '1930', reference: 'Album familial Dupont', personId: 'p17' },
  { id: 's8', title: 'Acte de mariage - Dupont/Bernard', type: 'marriage', date: '1930-09-20', reference: 'Lyon Mariages 1930, acte 245', personId: 'p17' },
  { id: 's9', title: 'Acte de naissance - Philippe Dupont', type: 'birth', date: '1938-05-15', reference: 'Lyon Naissances 1938, folio 89', personId: 'p25' },
  { id: 's10', title: 'Acte de mariage - Dupont/Rey', type: 'marriage', date: '1965-07-10', reference: 'Lyon Mariages 1965, acte 412', personId: 'p25' },
  { id: 's11', title: 'Acte de mariage - Bernard/Petit', type: 'marriage', date: '1874-05-22', reference: 'Marseille Mariages 1874, acte 234', personId: 'p3' },
  { id: 's12', title: 'Acte de mariage - Moreau/Fournier', type: 'marriage', date: '1900-03-18', reference: 'Bordeaux Mariages 1900, acte 178', personId: 'p13' },
  { id: 's13', title: 'Photo de mariage - Moreau/Dupont', type: 'photo', date: '1928-06-15', reference: 'Collection privée', personId: 'p21' },
];

// ============ BRANCHES (computed at runtime) ============
export const BRANCH_COLORS = [
  '#c9a84c', // Gold - Branche Dupont principale
  '#4a9eff', // Blue - Branche Bernard
  '#8b5cf6', // Violet - Branche Moreau
  '#10b981', // Emerald - Branche Roux
];

export function getSampleData(): TreeData {
  return {
    persons,
    relations,
    sources,
    branches: [], // computed at runtime
    treeName: 'Famille Dupont-Martin',
  };
}

export { persons, relations, sources };
