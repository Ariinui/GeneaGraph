export function computeBetweenness(
  nodeIds: string[],
  edges: { from: string; to: string }[]
): Map<string, number> {
  if (nodeIds.length < 3) return new Map();

  const adj = new Map<string, string[]>();
  nodeIds.forEach(n => adj.set(n, []));
  edges.forEach(({ from, to }) => {
    if (adj.has(from) && adj.has(to)) {
      adj.get(from)!.push(to);
      adj.get(to)!.push(from);
    }
  });

  const bc = new Map<string, number>(nodeIds.map(n => [n, 0]));

  for (const s of nodeIds) {
    const stack: string[] = [];
    const pred  = new Map<string, string[]>(nodeIds.map(n => [n, []]));
    const sigma = new Map<string, number>(nodeIds.map(n => [n, 0]));
    sigma.set(s, 1);
    const dist = new Map<string, number>(nodeIds.map(n => [n, -1]));
    dist.set(s, 0);
    const queue = [s];

    while (queue.length) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.get(v)!) {
        if (dist.get(w) === -1) { queue.push(w); dist.set(w, dist.get(v)! + 1); }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>(nodeIds.map(n => [n, 0]));
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) bc.set(w, bc.get(w)! + delta.get(w)!);
    }
  }

  // Normalize to [0, 1]
  const max = Math.max(0, ...bc.values());
  if (max > 0) bc.forEach((v, k) => bc.set(k, v / max));
  return bc;
}
