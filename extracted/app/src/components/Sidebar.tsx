import { TreePine, FileText, Database, GitBranch, Search, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { RelationType, ViewMode } from '@/types/genealogy';

const navItems: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'tree', label: 'Arbre', icon: <TreePine size={18} /> },
  { mode: 'report', label: 'Rapport', icon: <FileText size={18} /> },
  { mode: 'data', label: 'Données', icon: <Database size={18} /> },
  { mode: 'relations', label: 'Relations', icon: <GitBranch size={18} /> },
];

const relationFilterConfig: { type: RelationType; label: string; color: string }[] = [
  { type: 'parent', label: 'Parenté', color: '#4a9eff' },
  { type: 'alliance', label: 'Alliance', color: '#c9a84c' },
  { type: 'witness', label: 'Témoin', color: '#8b5cf6' },
  { type: 'godparent', label: 'Parrainage', color: '#10b981' },
];

export default function Sidebar() {
  const {
    viewMode,
    setViewMode,
    activeFilters,
    toggleRelationFilter,
    branches,
    activeBranchFilters,
    toggleBranchFilter,
    searchQuery,
    setSearchQuery,
    persons,
    relations,
  } = useApp();

  const allPersons = persons;
  const searchResults = searchQuery.length > 1
    ? allPersons.filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const generationCount = new Set(persons.map((p) => p.generation).filter(Boolean)).size;
  const years = persons
    .map((p) => p.birthDate?.split('-')[0])
    .filter(Boolean)
    .map(Number);
  const minYear = years.length ? Math.min(...years) : 0;
  const maxYear = years.length ? Math.max(...years) : 0;

  return (
    <aside className="w-[280px] min-w-[280px] h-screen bg-[#0a0a0f] border-r border-[#2a2a3a] flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center">
            <TreePine size={16} className="text-[#c9a84c]" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-[0.12em] text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              GENEAGRAPH
            </h1>
            <p className="text-[10px] text-[#5a5864] tracking-[0.15em] uppercase">Généalogie</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => setViewMode(item.mode)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 ${
              viewMode === item.mode
                ? 'bg-[#1e1e28] text-[#c9a84c] border-l-2 border-[#c9a84c]'
                : 'text-[#8a8894] hover:bg-[#14141c] hover:text-[#e8e6e1]'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mx-4 h-px bg-[#2a2a3a]" />

      {/* Search */}
      <div className="px-4 py-3 relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5864]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une personne..."
            className="w-full bg-[#14141c] border border-[#2a2a3a] rounded-lg pl-9 pr-8 py-2 text-[12px] text-[#e8e6e1] placeholder-[#5a5864] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a5864] hover:text-[#e8e6e1]"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-[52px] bg-[#1e1e28] border border-[#2a2a3a] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setViewMode('tree');
                  setSearchQuery('');
                  // The graph will handle selection via a custom event
                  window.dispatchEvent(new CustomEvent('geneagraph:selectPerson', { detail: p.id }));
                }}
                className="w-full text-left px-3 py-2 text-[12px] text-[#e8e6e1] hover:bg-[#2a2a3a] transition-colors"
              >
                <span className="font-medium">{p.firstName} {p.lastName}</span>
                <span className="text-[#5a5864] ml-2">{p.birthDate?.split('-')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-[#2a2a3a]" />

      {/* Relation Filters */}
      <div className="px-4 py-3">
        <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-2.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Types de liens
        </h3>
        <div className="space-y-1.5">
          {relationFilterConfig.map((cfg) => (
            <label
              key={cfg.type}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <button
                onClick={() => toggleRelationFilter(cfg.type)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                  activeFilters.includes(cfg.type)
                    ? 'bg-[#c9a84c] border-[#c9a84c]'
                    : 'border-[#2a2a3a] group-hover:border-[#5a5864]'
                }`}
              >
                {activeFilters.includes(cfg.type) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[12px] text-[#8a8894] group-hover:text-[#e8e6e1] transition-colors">{cfg.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mx-4 h-px bg-[#2a2a3a]" />

      {/* Branch Filters */}
      {branches.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-2.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Branches
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => toggleBranchFilter(branch.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 border ${
                  activeBranchFilters.includes(branch.id)
                    ? 'border-transparent text-[#0a0a0f]'
                    : 'border-[#2a2a3a] text-[#8a8894] hover:border-[#5a5864]'
                }`}
                style={
                  activeBranchFilters.includes(branch.id)
                    ? { backgroundColor: branch.color }
                    : { backgroundColor: 'transparent' }
                }
              >
                {branch.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Statistics */}
      <div className="px-4 py-4 border-t border-[#2a2a3a]">
        <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Statistiques
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#14141c] rounded-lg p-2.5 border border-[#2a2a3a]">
            <p className="text-[18px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{persons.length}</p>
            <p className="text-[10px] text-[#5a5864] uppercase tracking-wide">Personnes</p>
          </div>
          <div className="bg-[#14141c] rounded-lg p-2.5 border border-[#2a2a3a]">
            <p className="text-[18px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {relations.filter((r) => r.type === 'alliance').length}
            </p>
            <p className="text-[10px] text-[#5a5864] uppercase tracking-wide">Unions</p>
          </div>
          <div className="bg-[#14141c] rounded-lg p-2.5 border border-[#2a2a3a]">
            <p className="text-[18px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{generationCount}</p>
            <p className="text-[10px] text-[#5a5864] uppercase tracking-wide">Générations</p>
          </div>
          <div className="bg-[#14141c] rounded-lg p-2.5 border border-[#2a2a3a]">
            <p className="text-[18px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {minYear}-{maxYear}
            </p>
            <p className="text-[10px] text-[#5a5864] uppercase tracking-wide">Période</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
