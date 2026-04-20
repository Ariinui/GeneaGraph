import type { Person, Relation } from '@/types/genealogy';

export interface StoryEvent {
  type: 'birth' | 'death' | 'marriage' | 'child' | 'occupation' | 'migration' | 'witness';
  date: string | null;
  year: number | null;
  place: string | null;
  description: string;
  personId: string;
  relatedPersonId?: string;
  source?: string;
}

export interface StoryPath {
  personId: string;
  personName: string;
  events: StoryEvent[];
  summary: string;
  lifespan: { birth: number | null; death: number | null };
  generation: number;
  locations: string[];
  occupations: string[];
}

export interface TimelineEvent extends StoryEvent {
  personName: string;
  branch?: string;
}

function parseYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : dateStr;
}

export function generateStoryPath(
  person: Person,
  persons: Person[],
  relations: Relation[]
): StoryPath {
  const events: StoryEvent[] = [];
  const personMap = new Map(persons.map(p => [p.id, p]));
  
  const birthYear = parseYear(person.birthDate);
  const deathYear = parseYear(person.deathDate);
  
  if (person.birthDate) {
    events.push({
      type: 'birth',
      date: person.birthDate,
      year: birthYear,
      place: person.birthPlace || null,
      description: `Naissance${person.birthPlace ? ` à ${person.birthPlace}` : ''}`,
      personId: person.id
    });
  }
  
  const spouses = relations
    .filter(r => r.type === 'alliance' && (r.from === person.id || r.to === person.id))
    .map(r => personMap.get(r.from === person.id ? r.to : r.from))
    .filter(Boolean) as Person[];
  
  for (const spouse of spouses) {
    const spouseBirthYear = parseYear(spouse.birthDate);
    const marriageYear = spouseBirthYear ? spouseBirthYear + 20 : null;
    events.push({
      type: 'marriage',
      date: null,
      year: marriageYear,
      place: null,
      description: `Mariage avec ${spouse.firstName} ${spouse.lastName}`,
      personId: person.id,
      relatedPersonId: spouse.id
    });
  }
  
  const childrenRaw = relations
    .filter(r => r.type === 'parent' && r.from === person.id)
    .map(r => personMap.get(r.to))
    .filter(Boolean) as Person[];
  
  const children = childrenRaw.sort((a, b) => {
    const yearA = parseYear(a.birthDate) || 0;
    const yearB = parseYear(b.birthDate) || 0;
    return yearA - yearB;
  });
  
  for (const child of children) {
    const childBirthYear = parseYear(child.birthDate);
    events.push({
      type: 'child',
      date: child.birthDate || null,
      year: childBirthYear,
      place: child.birthPlace || null,
      description: `Naissance de ${child.firstName}${child.birthPlace ? ` à ${child.birthPlace}` : ''}`,
      personId: person.id,
      relatedPersonId: child.id
    });
  }
  
  if (person.occupation) {
    const occYear = birthYear ? birthYear + 18 : null;
    events.push({
      type: 'occupation',
      date: null,
      year: occYear,
      place: null,
      description: `Métier : ${person.occupation}`,
      personId: person.id
    });
  }
  
  if (person.deathDate) {
    events.push({
      type: 'death',
      date: person.deathDate,
      year: deathYear,
      place: person.deathPlace || null,
      description: `Décès${person.deathPlace ? ` à ${person.deathPlace}` : ''}`,
      personId: person.id
    });
  }
  
  events.sort((a, b) => (a.year || 0) - (b.year || 0));
  
  const locations = new Set<string>();
  if (person.birthPlace) locations.add(person.birthPlace);
  if (person.deathPlace) locations.add(person.deathPlace);
  children.forEach(c => {
    if (c.birthPlace) locations.add(c.birthPlace);
  });
  
  const occupations = person.occupation ? [person.occupation] : [];
  
  const age = birthYear && deathYear ? deathYear - birthYear : null;
  const ageText = age ? ` à l'âge de ${age} ans` : '';
  
  let summary = `${person.firstName} ${person.lastName}`;
  if (birthYear) summary += `, né(e) en ${birthYear}`;
  if (person.birthPlace) summary += ` à ${person.birthPlace}`;
  if (deathYear) summary += `, décédé(e) en ${deathYear}${ageText}`;
  if (person.deathPlace) summary += ` à ${person.deathPlace}`;
  if (children.length > 0) summary += `. Parent de ${children.length} enfant${children.length > 1 ? 's' : ''}`;
  
  return {
    personId: person.id,
    personName: `${person.firstName} ${person.lastName}`,
    events,
    summary,
    lifespan: { birth: birthYear, death: deathYear },
    generation: person.generation || 0,
    locations: Array.from(locations),
    occupations
  };
}

export function generateCrossFamilyTimeline(
  persons: Person[],
  relations: Relation[],
  yearRange?: [number, number]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const personMap = new Map(persons.map(p => [p.id, p]));
  
  for (const person of persons) {
    const birthYear = parseYear(person.birthDate);
    const deathYear = parseYear(person.deathDate);
    
    if (yearRange && birthYear) {
      if (birthYear < yearRange[0] || birthYear > yearRange[1]) continue;
    }
    
    if (person.birthDate && birthYear) {
      events.push({
        type: 'birth',
        date: person.birthDate,
        year: birthYear,
        place: person.birthPlace || null,
        description: `Naissance de ${person.firstName} ${person.lastName}`,
        personId: person.id,
        personName: `${person.firstName} ${person.lastName}`,
        branch: person.branch
      });
    }
    
    if (person.deathDate && deathYear) {
      events.push({
        type: 'death',
        date: person.deathDate,
        year: deathYear,
        place: person.deathPlace || null,
        description: `Décès de ${person.firstName} ${person.lastName}`,
        personId: person.id,
        personName: `${person.firstName} ${person.lastName}`,
        branch: person.branch
      });
    }
  }
  
  for (const relation of relations) {
    if (relation.type === 'alliance') {
      const p1 = personMap.get(relation.from);
      const p2 = personMap.get(relation.to);
      
      if (p1 && p2) {
        const p1Birth = parseYear(p1.birthDate);
        const year = p1Birth ? p1Birth + 25 : null;
        
        if (year && (!yearRange || (year >= yearRange[0] && year <= yearRange[1]))) {
          events.push({
            type: 'marriage',
            date: null,
            year,
            place: null,
            description: `Mariage de ${p1.firstName} ${p1.lastName} et ${p2.firstName} ${p2.lastName}`,
            personId: p1.id,
            relatedPersonId: p2.id,
            personName: `${p1.firstName} ${p1.lastName} & ${p2.firstName} ${p2.lastName}`,
            branch: p1.branch
          });
        }
      }
    }
  }
  
  return events.sort((a, b) => (a.year || 0) - (b.year || 0));
}

export function generateNarrative(
  person: Person,
  persons: Person[],
  relations: Relation[]
): string {
  const story = generateStoryPath(person, persons, relations);
  const personMap = new Map(persons.map(p => [p.id, p]));
  
  let narrative = `# ${person.firstName} ${person.lastName}\n\n`;
  
  if (person.birthDate || person.birthPlace) {
    narrative += `${person.firstName} ${person.lastName}`;
    if (person.birthDate) narrative += ` est né(e) en ${formatDate(person.birthDate)}`;
    if (person.birthPlace) narrative += ` à ${person.birthPlace}`;
    narrative += '.\n\n';
  }
  
  const parents = relations
    .filter(r => r.type === 'parent' && r.to === person.id)
    .map(r => personMap.get(r.from))
    .filter(Boolean) as Person[];
  
  if (parents.length > 0) {
    const parentNames = parents.map(p => `${p.firstName} ${p.lastName}`).join(' et ');
    narrative += `Enfant de ${parentNames}.\n\n`;
  }
  
  const spouses = relations
    .filter(r => r.type === 'alliance' && (r.from === person.id || r.to === person.id))
    .map(r => personMap.get(r.from === person.id ? r.to : r.from))
    .filter(Boolean) as Person[];
  
  if (spouses.length > 0) {
    narrative += `${person.firstName} s'est marié(e) avec ${spouses.map(s => `${s.firstName} ${s.lastName}`).join(', ')}.\n\n`;
  }
  
  const children = relations
    .filter(r => r.type === 'parent' && r.from === person.id)
    .map(r => personMap.get(r.to))
    .filter(Boolean) as Person[];
  
  if (children.length > 0) {
    narrative += `Parent de ${children.length} enfant${children.length > 1 ? 's' : ''} : ${children.map(c => c.firstName).join(', ')}.\n\n`;
  }
  
  if (person.occupation) {
    narrative += `Métier : ${person.occupation}.\n\n`;
  }
  
  if (person.deathDate) {
    narrative += `${person.firstName} ${person.lastName} est décédé(e) en ${formatDate(person.deathDate)}`;
    if (person.deathPlace) narrative += ` à ${person.deathPlace}`;
    const age = story.lifespan.birth && story.lifespan.death 
      ? story.lifespan.death - story.lifespan.birth 
      : null;
    if (age) narrative += `, à l'âge de ${age} ans`;
    narrative += '.\n\n';
  }
  
  if (person.notes) {
    narrative += `**Notes :** ${person.notes}\n\n`;
  }
  
  return narrative;
}
