import { useApp } from '@/context/AppContext';
import { Users, Heart, Eye, Baby, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';

const relationTypes = [
  {
    type: 'parent' as const,
    label: 'Parenté',
    description: 'Liens de filiation entre parents et enfants. Relations fondamentales de l\'arbre généalogique.',
    icon: <Users size={24} />,
    color: '#4a9eff',
    bgColor: 'rgba(74, 158, 255, 0.1)',
  },
  {
    type: 'alliance' as const,
    label: 'Alliance',
    description: 'Liens de mariage entre conjoints. Unissent les branches familiales.',
    icon: <Heart size={24} />,
    color: '#c9a84c',
    bgColor: 'rgba(201, 168, 76, 0.1)',
  },
  {
    type: 'adoption' as const,
    label: 'Adoption',
    description: 'Liens d\'adoption légale. Distincts de la filiation biologique, fréquents dans les archives.',
    icon: <UserCheck size={24} />,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
  },
  {
    type: 'tutelle' as const,
    label: 'Tutelle',
    description: 'Liens de tutelle légale d\'un orphelin confié à un tuteur. Courant dans les actes notariés.',
    icon: <ShieldCheck size={24} />,
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
  },
  {
    type: 'witness' as const,
    label: 'Témoin',
    description: 'Personnes présentes comme témoins lors d\'événements familiaux (mariages, baptêmes).',
    icon: <Eye size={24} />,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  {
    type: 'godparent' as const,
    label: 'Parrainage',
    description: 'Relations de parrainage et marrainage lors des baptêmes. Liens spirituels et sociaux.',
    icon: <Baby size={24} />,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
];

export default function Relations() {
  const { relations, branches, persons } = useApp();

  const stats = useMemo(() => {
    return relationTypes.map((rt) => ({
      ...rt,
      count: relations.filter((r) => r.type === rt.type).length,
    }));
  }, [relations]);

  // Cross-branch alliance matrix
  const branchMatrix = useMemo(() => {
    const matrix: Map<string, Map<string, number>> = new Map();
    branches.forEach((b1) => {
      matrix.set(b1.id, new Map());
      branches.forEach((b2) => {
        matrix.get(b1.id)!.set(b2.id, 0);
      });
    });

    relations
      .filter((r) => r.type === 'alliance')
      .forEach((r) => {
        const fromPerson = persons.find((p) => p.id === r.from);
        const toPerson = persons.find((p) => p.id === r.to);
        if (fromPerson?.branch && toPerson?.branch) {
          const current = matrix.get(fromPerson.branch)?.get(toPerson.branch) || 0;
          matrix.get(fromPerson.branch)!.set(toPerson.branch, current + 1);
          if (fromPerson.branch !== toPerson.branch) {
            const reverse = matrix.get(toPerson.branch)?.get(fromPerson.branch) || 0;
            matrix.get(toPerson.branch)!.set(fromPerson.branch, reverse + 1);
          }
        }
      });

    return matrix;
  }, [relations, branches, persons]);

  const branchColorMap = new Map<string, string>();
  branches.forEach((b) => branchColorMap.set(b.id, b.color));

  const maxMatrixValue = useMemo(() => {
    let max = 0;
    branchMatrix.forEach((row) => {
      row.forEach((val) => {
        if (val > max) max = val;
      });
    });
    return max;
  }, [branchMatrix]);

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Types de Relations
        </h1>
        <p className="text-[13px] text-[#8a8894] mt-1">Analyse des liens familiaux</p>
      </div>

      {/* Relation Type Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.type}
            className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6 hover:border-[#5a5864] transition-colors"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: stat.bgColor, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[16px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {stat.label}
                  </h3>
                  <span
                    className="text-[22px] font-semibold"
                    style={{ color: stat.color, fontFamily: 'Cormorant Garamond, serif' }}
                  >
                    {stat.count}
                  </span>
                </div>
                <p className="text-[12px] text-[#8a8894] leading-relaxed">{stat.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cross-branch alliance matrix */}
      {branches.length > 1 && (
        <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6 mb-8">
          <h2 className="text-[18px] font-semibold text-[#e8e6e1] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Matrice des alliances
          </h2>
          <p className="text-[12px] text-[#8a8894] mb-6">
            Nombre d'alliances (mariages) entre les différentes branches familiales
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2" />
                  {branches.map((b) => (
                    <th key={b.id} className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                        <span className="text-[10px] text-[#8a8894]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {b.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.map((b1) => (
                  <tr key={b1.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b1.color }} />
                        <span className="text-[10px] text-[#e8e6e1]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {b1.name}
                        </span>
                      </div>
                    </td>
                    {branches.map((b2) => {
                      const value = branchMatrix.get(b1.id)?.get(b2.id) || 0;
                      const intensity = maxMatrixValue > 0 ? value / maxMatrixValue : 0;
                      return (
                        <td key={b2.id} className="px-3 py-2 text-center">
                          <div
                            className="w-10 h-10 rounded-lg mx-auto flex items-center justify-center text-[12px] font-medium"
                            style={{
                              backgroundColor: value > 0 ? `rgba(201, 168, 76, ${0.1 + intensity * 0.5})` : '#0a0a0f',
                              color: value > 0 ? '#e0c97f' : '#5a5864',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            {value}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Most connected relations */}
      <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl p-6">
        <h2 className="text-[18px] font-semibold text-[#e8e6e1] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Relations détaillées
        </h2>
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {relations.slice(0, 20).map((r) => {
            const fromPerson = persons.find((p) => p.id === r.from);
            const toPerson = persons.find((p) => p.id === r.to);
            if (!fromPerson || !toPerson) return null;
            const typeConfig = relationTypes.find((t) => t.type === r.type);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a] hover:border-[#5a5864] transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: typeConfig?.color || '#8a8894' }}
                />
                <span className="text-[12px] text-[#e8e6e1] font-medium w-28 truncate">
                  {fromPerson.firstName} {fromPerson.lastName}
                </span>
                <ArrowRight size={12} className="text-[#5a5864] flex-shrink-0" />
                <span className="text-[12px] text-[#e8e6e1] font-medium w-28 truncate">
                  {toPerson.firstName} {toPerson.lastName}
                </span>
                <span className="text-[10px] text-[#5a5864] ml-auto px-2 py-0.5 rounded" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {typeConfig?.label || r.type}
                </span>
                {r.label && (
                  <span className="text-[10px] text-[#8a8894]">{r.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
