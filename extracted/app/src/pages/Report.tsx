import { useApp } from '@/context/AppContext';
import { Users, Heart, GitBranch, Calendar, Star, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

export default function Report() {
  const { persons, relations, branches, treeName, getShortestPath } = useApp();

  const stats = useMemo(() => {
    const generationCount = new Set(persons.map((p) => p.generation).filter(Boolean)).size;
    const allianceCount = relations.filter((r) => r.type === 'alliance').length;
    const years = persons
      .map((p) => p.birthDate?.split('-')[0])
      .filter(Boolean)
      .map(Number);
    const minYear = years.length ? Math.min(...years) : 0;
    const maxYear = years.length ? Math.max(...years) : 0;

    // Top connected persons (hubs)
    const degreeMap = new Map<string, number>();
    persons.forEach((p) => degreeMap.set(p.id, 0));
    relations.forEach((r) => {
      if (r.type === 'parent' || r.type === 'alliance') {
        degreeMap.set(r.from, (degreeMap.get(r.from) || 0) + 1);
        degreeMap.set(r.to, (degreeMap.get(r.to) || 0) + 1);
      }
    });
    const topHubs = [...degreeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, degree]) => ({
        person: persons.find((p) => p.id === id)!,
        degree,
      }));

    // Notable paths
    const notablePaths = [];
    const oldestPerson = persons.filter((p) => p.birthDate).sort((a, b) => a.birthDate!.localeCompare(b.birthDate!))[0];
    const youngestPerson = persons.filter((p) => p.birthDate).sort((a, b) => b.birthDate!.localeCompare(a.birthDate!))[0];
    if (oldestPerson && youngestPerson && oldestPerson.id !== youngestPerson.id) {
      const path = getShortestPath(oldestPerson.id, youngestPerson.id);
      if (path.length > 0) {
        notablePaths.push({
          from: oldestPerson,
          to: youngestPerson,
          hops: path.length - 1,
          path,
        });
      }
    }

    // Timeline distribution
    const decadeMap = new Map<string, number>();
    persons.forEach((p) => {
      if (p.birthDate) {
        const decade = `${Math.floor(parseInt(p.birthDate.split('-')[0]) / 10) * 10}s`;
        decadeMap.set(decade, (decadeMap.get(decade) || 0) + 1);
      }
    });
    const timeline = [...decadeMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    // Relation counts by type
    const parentCount = relations.filter((r) => r.type === 'parent').length;
    const witnessCount = relations.filter((r) => r.type === 'witness').length;
    const godparentCount = relations.filter((r) => r.type === 'godparent').length;

    return {
      generationCount,
      allianceCount,
      minYear,
      maxYear,
      topHubs,
      notablePaths,
      timeline,
      parentCount,
      witnessCount,
      godparentCount,
    };
  }, [persons, relations, getShortestPath]);

  const branchColorMap = new Map<string, string>();
  branches.forEach((b) => branchColorMap.set(b.id, b.color));

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Rapport Généalogique
        </h1>
        <p className="text-[13px] text-[#8a8894] mt-1">{treeName}</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[#4a9eff]" />
            <span className="text-[10px] text-[#5a5864] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Personnes</span>
          </div>
          <p className="text-[28px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{persons.length}</p>
        </div>
        <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-[#f43f5e]" />
            <span className="text-[10px] text-[#5a5864] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Unions</span>
          </div>
          <p className="text-[28px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stats.allianceCount}</p>
        </div>
        <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch size={16} className="text-[#8b5cf6]" />
            <span className="text-[10px] text-[#5a5864] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Générations</span>
          </div>
          <p className="text-[28px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stats.generationCount}</p>
        </div>
        <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-[#c9a84c]" />
            <span className="text-[10px] text-[#5a5864] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Période</span>
          </div>
          <p className="text-[28px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stats.minYear}-{stats.maxYear}</p>
        </div>
      </div>

      {/* Branches */}
      <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[#e8e6e1] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Branches détectées
        </h2>
        <div className="space-y-3">
          {branches.map((branch) => (
            <div key={branch.id} className="flex items-center gap-4 p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branch.color }} />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[#e8e6e1]">{branch.name}</p>
                <p className="text-[11px] text-[#5a5864]">{branch.nodeCount} personnes</p>
              </div>
              {branch.hubNodeId && (
                <div className="flex items-center gap-2">
                  <Star size={12} className="text-[#c9a84c]" />
                  <span className="text-[11px] text-[#8a8894]">
                    Hub: {persons.find((p) => p.id === branch.hubNodeId)?.firstName} {persons.find((p) => p.id === branch.hubNodeId)?.lastName}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Personnes clés */}
      <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[#e8e6e1] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Personnes clés
        </h2>
        <p className="text-[12px] text-[#8a8894] mb-4">Nœuds les plus connectés du graphe</p>
        <div className="space-y-2">
          {stats.topHubs.map(({ person, degree }, idx) => (
            <div key={person.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
              <span className="text-[12px] text-[#5a5864] w-5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>#{idx + 1}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#0a0a0f]"
                style={{
                  background: `linear-gradient(135deg, ${person.branch ? branchColorMap.get(person.branch) || '#c9a84c' : '#8a8894'}, #b87333)`,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {person.firstName[0]}{person.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-[#e8e6e1] font-medium">{person.firstName} {person.lastName}</p>
                <p className="text-[10px] text-[#5a5864]">{person.occupation || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold text-[#c9a84c]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{degree}</p>
                <p className="text-[10px] text-[#5a5864]">connexions</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chemins notables */}
      {stats.notablePaths.length > 0 && (
        <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6 mb-6">
          <h2 className="text-[18px] font-semibold text-[#e8e6e1] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Chemins notables
          </h2>
          <div className="space-y-3">
            {stats.notablePaths.map((np, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-[#e8e6e1] font-medium">{np.from.firstName} {np.from.lastName}</span>
                  <ArrowRight size={14} className="text-[#c9a84c]" />
                  <span className="text-[13px] text-[#e8e6e1] font-medium">{np.to.firstName} {np.to.lastName}</span>
                  <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-medium bg-[#c9a84c]/10 text-[#c9a84c]">
                    {np.hops} sauts
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 ml-1">
                  {np.path.map((pid, pidx) => {
                    const p = persons.find((per) => per.id === pid);
                    return (
                      <span key={pid} className="flex items-center gap-1">
                        <span className="text-[10px] text-[#8a8894]">{p?.firstName}</span>
                        {pidx < np.path.length - 1 && <ArrowRight size={10} className="text-[#5a5864]" />}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Couverture temporelle */}
      <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6 mb-6">
        <h2 className="text-[18px] font-semibold text-[#e8e6e1] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Couverture temporelle
        </h2>
        <div className="flex items-end gap-2 h-32">
          {stats.timeline.map(([decade, count]) => {
            const maxCount = Math.max(...stats.timeline.map(([, c]) => c));
            const height = (count / maxCount) * 100;
            return (
              <div key={decade} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-[#8a8894]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
                <div
                  className="w-full rounded-t bg-[#c9a84c]/60 hover:bg-[#c9a84c] transition-colors"
                  style={{ height: `${height}%` }}
                />
                <div className="text-[9px] text-[#5a5864]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{decade}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relation counts */}
      <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6 mb-8">
        <h2 className="text-[18px] font-semibold text-[#e8e6e1] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Répartition des relations
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
            <p className="text-[20px] font-semibold text-[#4a9eff]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stats.parentCount}</p>
            <p className="text-[10px] text-[#5a5864] mt-1">Parenté</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
            <p className="text-[20px] font-semibold text-[#c9a84c]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stats.allianceCount}</p>
            <p className="text-[10px] text-[#5a5864] mt-1">Alliances</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
            <p className="text-[20px] font-semibold text-[#8b5cf6]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stats.witnessCount}</p>
            <p className="text-[10px] text-[#5a5864] mt-1">Témoins</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
            <p className="text-[20px] font-semibold text-[#10b981]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{stats.godparentCount}</p>
            <p className="text-[10px] text-[#5a5864] mt-1">Parrainages</p>
          </div>
        </div>
      </div>
    </div>
  );
}
