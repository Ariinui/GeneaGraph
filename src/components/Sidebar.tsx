import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { TreePine, FileText, Database, GitBranch, Search, X, Trash2, ChevronLeft, ChevronRight, Clock, BarChart3, Menu } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { RelationType, ViewMode } from '@/types/genealogy';
import type { Branch } from '@/types/genealogy';

const navItems: { mode: ViewMode; path: string; label: string; icon: React.ReactNode }[] = [
  { mode: 'tree',      path: '/',          label: 'Arbre',     icon: <TreePine size={18} /> },
  { mode: 'report',    path: '/report',    label: 'Rapport',   icon: <FileText size={18} /> },
  { mode: 'data',      path: '/data',      label: 'Données',   icon: <Database size={18} /> },
  { mode: 'relations', path: '/relations', label: 'Relations', icon: <GitBranch size={18} /> },
  { mode: 'analytics', path: '/analytics', label: 'Analyse',   icon: <BarChart3 size={18} /> },
];

const relationFilterConfig: { type: RelationType; label: string; color: string }[] = [
  { type: 'parent',    label: 'Parenté',    color: '#4a9eff' },
  { type: 'alliance',  label: 'Alliance',   color: '#c9a84c' },
  { type: 'adoption',  label: 'Adoption',   color: '#f97316' },
  { type: 'tutelle',   label: 'Tutelle',    color: '#06b6d4' },
  { type: 'witness',   label: 'Témoin',     color: '#8b5cf6' },
  { type: 'godparent', label: 'Parrainage', color: '#10b981' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
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
    deleteBranch,
    yearRange,
    setYearRange,
  } = useApp();

  const birthYears = persons.map(p => p.birthDate ? parseInt(p.birthDate) : NaN).filter(y => !isNaN(y) && y > 1000 && y < 2100);
  const dataMin = birthYears.length ? Math.min(...birthYears) : 1700;
  const dataMax = birthYears.length ? Math.max(...birthYears) : 2024;

  const [temporalActive, setTemporalActive] = useState(false);
  const [localMin, setLocalMin] = useState(dataMin);
  const [localMax, setLocalMax] = useState(dataMax);

  useEffect(() => {
    if (temporalActive) {
      setLocalMin(dataMin);
      setLocalMax(dataMax);
      setYearRange([dataMin, dataMax]);
    } else {
      setYearRange(null);
    }
  }, [temporalActive]); // eslint-disable-line

  const visibleCount = persons.filter(p => {
    if (!yearRange) return true;
    const y = p.birthDate ? parseInt(p.birthDate) : null;
    return y === null || (y >= yearRange[0] && y <= yearRange[1]);
  }).length;

  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [collapsed, setCollapsed] = useState(true);

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

  if (collapsed) {
    return (
      <>
        {/* Mobile hamburger button */}
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg bg-[#0a0a0f]/90 backdrop-blur-sm border border-[#2a2a3a] flex items-center justify-center text-[#c9a84c] transition-all cursor-pointer"
          title="Menu"
        >
          <Menu size={18} />
        </button>
        
        {/* Desktop collapsed sidebar */}
        <aside className="hidden md:flex w-[56px] min-w-[56px] h-screen bg-[#0a0a0f] border-r border-[#2a2a3a] flex-col items-center py-4 gap-1">
          <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center mb-3">
            <TreePine size={15} className="text-[#c9a84c]" />
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.mode}
                onClick={() => { setViewMode(item.mode); navigate(item.path); }}
                title={item.label}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isActive ? 'bg-[#1e1e28] text-[#c9a84c]' : 'text-[#5a5864] hover:bg-[#14141c] hover:text-[#e8e6e1]'
                }`}
              >
                {item.icon}
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            onClick={() => setCollapsed(false)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#5a5864] hover:bg-[#14141c] hover:text-[#c9a84c] transition-all cursor-pointer"
            title="Ouvrir la sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={() => setCollapsed(true)}
      />
      
      <aside className="w-[280px] min-w-[280px] h-screen bg-[#0a0a0f] border-r border-[#2a2a3a] flex flex-col fixed md:relative z-50 md:z-auto">
      <div className="px-5 py-5 border-b border-[#2a2a3a] flex-shrink-0">
        <div className="flex items-center justify-between">
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
          <button
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#5a5864] hover:bg-[#1e1e28] hover:text-[#c9a84c] transition-all cursor-pointer"
            title="Réduire la sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.mode}
                onClick={() => { setViewMode(item.mode); navigate(item.path); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#1e1e28] text-[#c9a84c] border-l-2 border-[#c9a84c]'
                    : 'text-[#8a8894] hover:bg-[#14141c] hover:text-[#e8e6e1]'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
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
                  navigate('/');
                  setSearchQuery('');
                  window.dispatchEvent(new CustomEvent('geneagraph:selectPerson', { detail: p.id }));
                }}
                className="w-full text-left px-3 py-2 text-[12px] text-[#e8e6e1] hover:bg-[#2a2a3a] transition-colors cursor-pointer"
              >
                <span className="font-medium">{p.firstName} {p.lastName}</span>
                <span className="text-[#5a5864] ml-2">{p.birthDate?.split('-')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-[#2a2a3a]" />

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
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 cursor-pointer ${
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

      {/* Temporal filter */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] flex items-center gap-1.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <Clock size={10} /> Période
          </h3>
          <button
            onClick={() => setTemporalActive(v => !v)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${temporalActive ? 'border-[#c9a84c]/50 text-[#c9a84c] bg-[#c9a84c]/10' : 'border-[#2a2a3a] text-[#5a5864] hover:border-[#5a5864]'}`}
          >
            {temporalActive ? 'Actif' : 'Off'}
          </button>
        </div>
        {temporalActive && (
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-[#5a5864]">Depuis</span>
                <span className="text-[11px] text-[#c9a84c]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{localMin}</span>
              </div>
              <input type="range" min={dataMin} max={dataMax} value={localMin}
                onChange={e => { const v = Math.min(Number(e.target.value), localMax - 1); setLocalMin(v); setYearRange([v, localMax]); }}
                className="w-full h-1 cursor-pointer accent-[#c9a84c]" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-[#5a5864]">Jusqu'à</span>
                <span className="text-[11px] text-[#c9a84c]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{localMax}</span>
              </div>
              <input type="range" min={dataMin} max={dataMax} value={localMax}
                onChange={e => { const v = Math.max(Number(e.target.value), localMin + 1); setLocalMax(v); setYearRange([localMin, v]); }}
                className="w-full h-1 cursor-pointer accent-[#c9a84c]" />
            </div>
            <p className="text-[10px] text-[#5a5864] text-center">{localMin} — {localMax} · <span className="text-[#c9a84c]">{visibleCount}</span> personnes</p>
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-[#2a2a3a]" />

      {branches.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-2.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Branches
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center gap-0.5 group">
                <button
                  onClick={() => toggleBranchFilter(branch.id)}
                  className={`px-2.5 py-1 rounded-l-md text-[11px] font-medium transition-all duration-200 border-y border-l cursor-pointer ${
                    activeBranchFilters.includes(branch.id)
                      ? 'border-transparent text-[#0a0a0f]'
                      : 'border-[#2a2a3a] text-[#8a8894] hover:border-[#5a5864]'
                  }`}
                  style={activeBranchFilters.includes(branch.id) ? { backgroundColor: branch.color } : {}}
                >
                  {branch.name}
                </button>
                <button
                  onClick={() => setBranchToDelete(branch)}
                  className={`px-1 py-1 rounded-r-md text-[11px] transition-all duration-200 border-y border-r opacity-0 group-hover:opacity-100 cursor-pointer ${
                    activeBranchFilters.includes(branch.id)
                      ? 'border-transparent text-[#0a0a0f] hover:bg-black/20'
                      : 'border-[#2a2a3a] text-[#5a5864] hover:text-red-400 hover:border-red-900/50'
                  }`}
                  style={activeBranchFilters.includes(branch.id) ? { backgroundColor: branch.color } : {}}
                  title="Supprimer la branche"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>

          <AlertDialog open={!!branchToDelete} onOpenChange={open => { if (!open) setBranchToDelete(null); }}>
            <AlertDialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0]">
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer « {branchToDelete?.name} » ?</AlertDialogTitle>
                <AlertDialogDescription className="text-[#8a8894]">
                  Toutes les personnes de cette branche et leurs relations seront supprimées définitivement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28]">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if (branchToDelete) { deleteBranch(branchToDelete.id); setBranchToDelete(null); } }} className="bg-red-700 hover:bg-red-600 text-white">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      </div>

      <div className="px-4 py-4 border-t border-[#2a2a3a] flex-shrink-0">
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
    </>
  );
}
