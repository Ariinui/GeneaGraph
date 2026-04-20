import type { Person, Relation } from '@/types/genealogy';

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  maxDegree: number;
  connectedComponents: number;
  avgClustering: number;
}

export interface PersonMetrics {
  personId: string;
  degree: number;
  inDegree: number;
  outDegree: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  clustering: number;
  isHub: boolean;
  isBridge: boolean;
}

export interface Community {
  id: string;
  memberIds: string[];
  size: number;
  density: number;
  hubId: string | null;
  color: string;
}

export function computeNetworkMetrics(persons: Person[], relations: Relation[]): NetworkMetrics {
  const n = persons.length;
  const m = relations.filter(r => r.type === 'parent' || r.type === 'alliance').length;
  
  if (n === 0) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      density: 0,
      avgDegree: 0,
      maxDegree: 0,
      connectedComponents: 0,
      avgClustering: 0
    };
  }

  const adj = new Map<string, Set<string>>();
  persons.forEach(p => adj.set(p.id, new Set()));
  
  relations.forEach(r => {
    if (r.type === 'parent' || r.type === 'alliance') {
      adj.get(r.from)?.add(r.to);
      adj.get(r.to)?.add(r.from);
    }
  });

  const degrees = persons.map(p => adj.get(p.id)?.size || 0);
  const maxDegree = Math.max(0, ...degrees);
  const avgDegree = degrees.reduce((a, b) => a + b, 0) / n;
  
  const density = n > 1 ? (2 * m) / (n * (n - 1)) : 0;

  const visited = new Set<string>();
  let components = 0;
  for (const p of persons) {
    if (visited.has(p.id)) continue;
    components++;
    const stack = [p.id];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
  }

  let totalClustering = 0;
  let validNodes = 0;
  for (const p of persons) {
    const neighbors = Array.from(adj.get(p.id) || []);
    if (neighbors.length < 2) continue;
    
    let triangles = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (adj.get(neighbors[i])?.has(neighbors[j])) {
          triangles++;
        }
      }
    }
    
    const possibleTriangles = (neighbors.length * (neighbors.length - 1)) / 2;
    if (possibleTriangles > 0) {
      totalClustering += triangles / possibleTriangles;
      validNodes++;
    }
  }
  
  const avgClustering = validNodes > 0 ? totalClustering / validNodes : 0;

  return {
    nodeCount: n,
    edgeCount: m,
    density,
    avgDegree,
    maxDegree,
    connectedComponents: components,
    avgClustering
  };
}

export function computePersonMetrics(
  persons: Person[],
  relations: Relation[],
  betweennessMap: Map<string, number>
): Map<string, PersonMetrics> {
  const adj = new Map<string, Set<string>>();
  const inAdj = new Map<string, Set<string>>();
  const outAdj = new Map<string, Set<string>>();
  
  persons.forEach(p => {
    adj.set(p.id, new Set());
    inAdj.set(p.id, new Set());
    outAdj.set(p.id, new Set());
  });
  
  relations.forEach(r => {
    if (r.type === 'parent' || r.type === 'alliance') {
      adj.get(r.from)?.add(r.to);
      adj.get(r.to)?.add(r.from);
      
      if (r.type === 'parent') {
        outAdj.get(r.from)?.add(r.to);
        inAdj.get(r.to)?.add(r.from);
      }
    }
  });

  const metrics = new Map<string, PersonMetrics>();
  
  const avgDegree = persons.length > 0 
    ? persons.reduce((sum, p) => sum + (adj.get(p.id)?.size || 0), 0) / persons.length 
    : 0;
  
  const maxBetweenness = Math.max(0.001, ...Array.from(betweennessMap.values()));
  
  for (const p of persons) {
    const neighbors = adj.get(p.id) || new Set();
    const degree = neighbors.size;
    const inDegree = inAdj.get(p.id)?.size || 0;
    const outDegree = outAdj.get(p.id)?.size || 0;
    
    const betweenness = betweennessMap.get(p.id) || 0;
    
    let closeness = 0;
    if (persons.length > 1) {
      const distances = new Map<string, number>();
      const queue = [p.id];
      distances.set(p.id, 0);
      
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const neighbor of adj.get(curr) || []) {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, distances.get(curr)! + 1);
            queue.push(neighbor);
          }
        }
      }
      
      const reachable = Array.from(distances.values()).filter(d => d > 0);
      if (reachable.length > 0) {
        const totalDist = reachable.reduce((a, b) => a + b, 0);
        closeness = reachable.length / totalDist;
      }
    }

    let clustering = 0;
    const neighborList = Array.from(neighbors);
    if (neighborList.length >= 2) {
      let triangles = 0;
      for (let i = 0; i < neighborList.length; i++) {
        for (let j = i + 1; j < neighborList.length; j++) {
          if (adj.get(neighborList[i])?.has(neighborList[j])) {
            triangles++;
          }
        }
      }
      const possibleTriangles = (neighborList.length * (neighborList.length - 1)) / 2;
      clustering = triangles / possibleTriangles;
    }

    metrics.set(p.id, {
      personId: p.id,
      degree,
      inDegree,
      outDegree,
      betweenness: betweenness / maxBetweenness,
      closeness,
      eigenvector: degree / (avgDegree + 1),
      clustering,
      isHub: degree >= avgDegree * 2,
      isBridge: betweenness / maxBetweenness > 0.5
    });
  }
  
  return metrics;
}

export function detectCommunities(
  persons: Person[],
  relations: Relation[],
  colors: string[] = ['#4a90a4', '#6b8e6b', '#c4785a', '#8b6b8e', '#b8a456', '#5a8b8b', '#8b5a6b', '#6b8b5a']
): Community[] {
  const adj = new Map<string, Set<string>>();
  persons.forEach(p => adj.set(p.id, new Set()));
  
  relations.forEach(r => {
    if (r.type === 'parent' || r.type === 'alliance') {
      adj.get(r.from)?.add(r.to);
      adj.get(r.to)?.add(r.from);
    }
  });

  const visited = new Set<string>();
  const communities: Community[] = [];
  let communityIndex = 0;

  for (const p of persons) {
    if (visited.has(p.id)) continue;
    
    const members: string[] = [];
    const stack = [p.id];
    
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      members.push(curr);
      
      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }

    if (members.length >= 2) {
      let maxDegree = 0;
      let hubId: string | null = null;
      
      for (const memberId of members) {
        const degree = adj.get(memberId)?.size || 0;
        if (degree > maxDegree) {
          maxDegree = degree;
          hubId = memberId;
        }
      }

      let edges = 0;
      for (const memberId of members) {
        for (const neighbor of adj.get(memberId) || []) {
          if (members.includes(neighbor)) edges++;
        }
      }
      edges /= 2;
      
      const density = members.length > 1 
        ? (2 * edges) / (members.length * (members.length - 1))
        : 0;

      communities.push({
        id: `community-${communityIndex}`,
        memberIds: members,
        size: members.length,
        density,
        hubId,
        color: colors[communityIndex % colors.length]
      });
      
      communityIndex++;
    }
  }

  return communities.sort((a, b) => b.size - a.size);
}

export function getTopInfluencers(
  personMetrics: Map<string, PersonMetrics>,
  limit: number = 5
): PersonMetrics[] {
  return Array.from(personMetrics.values())
    .sort((a, b) => b.betweenness - a.betweenness)
    .slice(0, limit);
}

export function getTopConnectors(
  personMetrics: Map<string, PersonMetrics>,
  limit: number = 5
): PersonMetrics[] {
  return Array.from(personMetrics.values())
    .filter(m => m.degree >= 3)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, limit);
}
