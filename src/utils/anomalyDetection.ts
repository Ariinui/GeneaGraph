import type { Person, Relation } from '@/types/genealogy';

export interface Anomaly {
  id: string;
  type: 'age' | 'date' | 'duplicate' | 'orphan' | 'cycle' | 'interval';
  severity: 'low' | 'medium' | 'high';
  personIds: string[];
  relationId?: string;
  message: string;
  details: string;
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  stats: {
    totalPersons: number;
    totalRelations: number;
    personsWithIssues: number;
    criticalIssues: number;
    warnings: number;
  };
  reliabilityScore: number;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{1,2})\s+([a-zA-Zéû]+)\s+(\d{4})$/,
    /^(\d{4})$/
  ];
  
  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      if (regex === formats[3]) {
        return new Date(parseInt(match[1]), 0, 1);
      }
      if (regex === formats[2]) {
        const months: Record<string, number> = {
          'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
          'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        const month = months[match[2].toLowerCase()];
        if (month !== undefined) {
          return new Date(parseInt(match[3]), month, parseInt(match[1]));
        }
      }
      if (regex === formats[0]) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
      if (regex === formats[1]) {
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      }
    }
  }
  
  const direct = new Date(dateStr);
  return isNaN(direct.getTime()) ? null : direct;
}

function getYear(date: Date): number {
  return date.getFullYear();
}

function calculateAgeAtDate(birthDate: Date, eventDate: Date): number {
  let age = getYear(eventDate) - getYear(birthDate);
  const monthDiff = eventDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function detectAnomalies(persons: Person[], relations: Relation[]): AnomalyReport {
  const anomalies: Anomaly[] = [];
  const personMap = new Map(persons.map(p => [p.id, p]));
  const processedPairs = new Set<string>();

  for (const person of persons) {
    const birthDate = parseDate(person.birthDate);
    const deathDate = parseDate(person.deathDate);

    if (birthDate && deathDate) {
      const ageAtDeath = calculateAgeAtDate(birthDate, deathDate);
      
      if (ageAtDeath < 0) {
        anomalies.push({
          id: `anomaly-${anomalies.length}`,
          type: 'date',
          severity: 'high',
          personIds: [person.id],
          message: `Date de décès antérieure à la naissance`,
          details: `${person.firstName} ${person.lastName} serait décédé(e) avant de naître (naissance: ${person.birthDate}, décès: ${person.deathDate})`
        });
      }
      
      if (ageAtDeath > 122) {
        anomalies.push({
          id: `anomaly-${anomalies.length}`,
          type: 'age',
          severity: 'medium',
          personIds: [person.id],
          message: `Âge au décès improbable (${ageAtDeath} ans)`,
          details: `${person.firstName} ${person.lastName} aurait vécu ${ageAtDeath} ans, ce qui dépasse le record mondial`
        });
      }
    }

    const parentRelations = relations.filter(r => r.type === 'parent' && r.to === person.id);
    for (const pr of parentRelations) {
      const parent = personMap.get(pr.from);
      if (!parent || !birthDate) continue;
      
      const parentBirth = parseDate(parent.birthDate);
      if (!parentBirth) continue;
      
      const parentAgeAtBirth = calculateAgeAtDate(parentBirth, birthDate);
      
      if (parentAgeAtBirth < 10) {
        anomalies.push({
          id: `anomaly-${anomalies.length}`,
          type: 'age',
          severity: 'high',
          personIds: [person.id, parent.id],
          relationId: pr.id,
          message: `Parent trop jeune`,
          details: `${parent.firstName} ${parent.lastName} n'avait que ${parentAgeAtBirth} ans à la naissance de ${person.firstName}`
        });
      } else if (parentAgeAtBirth > 70 && parent.gender === 'F') {
        anomalies.push({
          id: `anomaly-${anomalies.length}`,
          type: 'age',
          severity: 'medium',
          personIds: [person.id, parent.id],
          relationId: pr.id,
          message: `Mère très âgée à la naissance`,
          details: `${parent.firstName} ${parent.lastName} avait ${parentAgeAtBirth} ans à la naissance de ${person.firstName}`
        });
      } else if (parentAgeAtBirth > 80) {
        anomalies.push({
          id: `anomaly-${anomalies.length}`,
          type: 'age',
          severity: 'medium',
          personIds: [person.id, parent.id],
          relationId: pr.id,
          message: `Père très âgé à la naissance`,
          details: `${parent.firstName} ${parent.lastName} avait ${parentAgeAtBirth} ans à la naissance de ${person.firstName}`
        });
      }
    }

    const childRelations = relations.filter(r => r.type === 'parent' && r.from === person.id);
    if (childRelations.length >= 2) {
      const childrenWithDates = childRelations
        .map(r => ({ rel: r, child: personMap.get(r.to) }))
        .filter(c => c.child?.birthDate)
        .sort((a, b) => {
          const dateA = parseDate(a.child!.birthDate!);
          const dateB = parseDate(b.child!.birthDate!);
          return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
        });
      
      for (let i = 1; i < childrenWithDates.length; i++) {
        const prev = parseDate(childrenWithDates[i - 1].child!.birthDate!);
        const curr = parseDate(childrenWithDates[i].child!.birthDate!);
        
        if (prev && curr) {
          const monthsDiff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24 * 30);
          
          if (monthsDiff < 9) {
            anomalies.push({
              id: `anomaly-${anomalies.length}`,
              type: 'interval',
              severity: 'high',
              personIds: [childrenWithDates[i - 1].child!.id, childrenWithDates[i].child!.id, person.id],
              message: `Naissances trop rapprochées`,
              details: `${childrenWithDates[i - 1].child!.firstName} et ${childrenWithDates[i].child!.firstName} sont nés à seulement ${Math.round(monthsDiff)} mois d'intervalle`
            });
          }
        }
      }
    }

    const allRelations = relations.filter(r => r.from === person.id || r.to === person.id);
    if (allRelations.length === 0) {
      anomalies.push({
        id: `anomaly-${anomalies.length}`,
        type: 'orphan',
        severity: 'low',
        personIds: [person.id],
        message: `Personne sans relations`,
        details: `${person.firstName} ${person.lastName} n'est connecté(e) à aucune autre personne`
      });
    }
  }

  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const p1 = persons[i];
      const p2 = persons[j];
      
      if (p1.id === p2.id) continue;
      
      const pairKey = [p1.id, p2.id].sort().join('-');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);
      
      const sameFirstName = p1.firstName.toLowerCase() === p2.firstName.toLowerCase();
      const sameLastName = p1.lastName.toLowerCase() === p2.lastName.toLowerCase();
      const sameBirthDate = p1.birthDate === p2.birthDate && p1.birthDate !== undefined;
      
      if (sameFirstName && sameLastName) {
        const severity = sameBirthDate ? 'high' : 'medium';
        anomalies.push({
          id: `anomaly-${anomalies.length}`,
          type: 'duplicate',
          severity,
          personIds: [p1.id, p2.id],
          message: `Doublon potentiel`,
          details: `${p1.firstName} ${p1.lastName} apparaît deux fois${sameBirthDate ? ' avec la même date de naissance' : ''}`
        });
      }
    }
  }

  for (const relation of relations) {
    if (relation.type === 'parent') {
      const visited = new Set<string>();
      const stack = [{ node: relation.to, path: [relation.to] }];
      
      while (stack.length > 0) {
        const { node, path } = stack.shift()!;
        
        if (visited.has(node)) continue;
        visited.add(node);
        
        const descendants = relations
          .filter(r => r.type === 'parent' && r.from === node)
          .map(r => r.to);
        
        for (const desc of descendants) {
          if (desc === relation.from) {
            anomalies.push({
              id: `anomaly-${anomalies.length}`,
              type: 'cycle',
              severity: 'high',
              personIds: [relation.from, relation.to],
              relationId: relation.id,
              message: `Boucle détectée dans l'arbre`,
              details: `${personMap.get(relation.from)?.firstName} est à la fois ancêtre et descendant de ${personMap.get(relation.to)?.firstName}`
            });
          } else if (!visited.has(desc)) {
            stack.push({ node: desc, path: [...path, desc] });
          }
        }
      }
    }
  }

  const personsWithIssues = new Set(anomalies.flatMap(a => a.personIds));
  const criticalIssues = anomalies.filter(a => a.severity === 'high').length;
  const warnings = anomalies.filter(a => a.severity !== 'high').length;
  
  const reliabilityScore = persons.length > 0
    ? Math.max(0, 100 - (criticalIssues * 10) - (warnings * 3) - (personsWithIssues.size / persons.length * 20))
    : 100;

  return {
    anomalies,
    stats: {
      totalPersons: persons.length,
      totalRelations: relations.length,
      personsWithIssues: personsWithIssues.size,
      criticalIssues,
      warnings
    },
    reliabilityScore: Math.round(reliabilityScore)
  };
}

export function getAnomaliesByPerson(anomalies: Anomaly[], personId: string): Anomaly[] {
  return anomalies.filter(a => a.personIds.includes(personId));
}

export function getAnomaliesByType(anomalies: Anomaly[], type: Anomaly['type']): Anomaly[] {
  return anomalies.filter(a => a.type === type);
}
