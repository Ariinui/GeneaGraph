import type { Person } from '@/types/genealogy';

export interface LocationData {
  name: string;
  count: number;
  births: number;
  deaths: number;
  persons: string[];
}

export interface MigrationPath {
  from: string;
  to: string;
  count: number;
  persons: string[];
}

export interface LocationStats {
  totalLocations: number;
  topBirthLocations: LocationData[];
  topDeathLocations: LocationData[];
  migrationPaths: MigrationPath[];
  uniqueLocations: string[];
}

function parseYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

export function analyzeLocations(persons: Person[]): LocationStats {
  const birthLocations = new Map<string, LocationData>();
  const deathLocations = new Map<string, LocationData>();
  const migrations: MigrationPath[] = [];
  const allLocations = new Set<string>();

  for (const person of persons) {
    const birthPlace = person.birthPlace?.trim();
    const deathPlace = person.deathPlace?.trim();

    if (birthPlace) {
      allLocations.add(birthPlace);
      const existing = birthLocations.get(birthPlace) || {
        name: birthPlace,
        count: 0,
        births: 0,
        deaths: 0,
        persons: []
      };
      existing.births++;
      existing.count++;
      existing.persons.push(person.id);
      birthLocations.set(birthPlace, existing);
    }

    if (deathPlace) {
      allLocations.add(deathPlace);
      const existing = deathLocations.get(deathPlace) || {
        name: deathPlace,
        count: 0,
        births: 0,
        deaths: 0,
        persons: []
      };
      existing.deaths++;
      existing.count++;
      existing.persons.push(person.id);
      deathLocations.set(deathPlace, existing);
    }

    if (birthPlace && deathPlace && birthPlace !== deathPlace) {
      const existingMigration = migrations.find(
        m => m.from === birthPlace && m.to === deathPlace
      );
      if (existingMigration) {
        existingMigration.count++;
        existingMigration.persons.push(person.id);
      } else {
        migrations.push({
          from: birthPlace,
          to: deathPlace,
          count: 1,
          persons: [person.id]
        });
      }
    }
  }

  const topBirthLocations = Array.from(birthLocations.values())
    .sort((a, b) => b.births - a.births)
    .slice(0, 10);

  const topDeathLocations = Array.from(deathLocations.values())
    .sort((a, b) => b.deaths - a.deaths)
    .slice(0, 10);

  migrations.sort((a, b) => b.count - a.count);

  return {
    totalLocations: allLocations.size,
    topBirthLocations,
    topDeathLocations,
    migrationPaths: migrations.slice(0, 20),
    uniqueLocations: Array.from(allLocations).sort()
  };
}

export interface LocationTimeline {
  year: number;
  location: string;
  event: 'birth' | 'death';
  personId: string;
  personName: string;
}

export function generateLocationTimeline(persons: Person[]): LocationTimeline[] {
  const events: LocationTimeline[] = [];

  for (const person of persons) {
    const birthYear = parseYear(person.birthDate);
    const deathYear = parseYear(person.deathDate);

    if (person.birthPlace && birthYear) {
      events.push({
        year: birthYear,
        location: person.birthPlace,
        event: 'birth',
        personId: person.id,
        personName: `${person.firstName} ${person.lastName}`
      });
    }

    if (person.deathPlace && deathYear) {
      events.push({
        year: deathYear,
        location: person.deathPlace,
        event: 'death',
        personId: person.id,
        personName: `${person.firstName} ${person.lastName}`
      });
    }
  }

  return events.sort((a, b) => a.year - b.year);
}

export interface LocationByCentury {
  century: string;
  locations: Map<string, number>;
  topLocation: string;
  topCount: number;
}

export function analyzeLocationsByCentury(persons: Person[]): LocationByCentury[] {
  const centuryData = new Map<string, Map<string, number>>();

  for (const person of persons) {
    const birthYear = parseYear(person.birthDate);
    if (!birthYear || !person.birthPlace) continue;

    const century = `${Math.floor(birthYear / 100) + 1}e siècle`;
    const location = person.birthPlace;

    if (!centuryData.has(century)) {
      centuryData.set(century, new Map());
    }

    const locMap = centuryData.get(century)!;
    locMap.set(location, (locMap.get(location) || 0) + 1);
  }

  const result: LocationByCentury[] = [];
  const sortedCenturies = Array.from(centuryData.keys()).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  for (const century of sortedCenturies) {
    const locMap = centuryData.get(century)!;
    let topLocation = '';
    let topCount = 0;

    locMap.forEach((count, location) => {
      if (count > topCount) {
        topCount = count;
        topLocation = location;
      }
    });

    result.push({
      century,
      locations: locMap,
      topLocation,
      topCount
    });
  }

  return result;
}
