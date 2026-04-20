import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Search, Pencil, Trash2, Link, AlertTriangle, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Person, RelationType } from '@/types/genealogy';

const EMPTY_PERSON: Partial<Person> = { gender: 'M' };

const RELATION_TYPES: { value: RelationType; label: string; color: string }[] = [
  { value: 'parent',     label: 'Parenté',    color: '#4a9eff' },
  { value: 'alliance',   label: 'Alliance',   color: '#c9a84c' },
  { value: 'witness',    label: 'Témoin',     color: '#8b5cf6' },
  { value: 'godparent',  label: 'Parrainage', color: '#10b981' },
];

function PersonForm({
  value,
  onChange,
}: {
  value: Partial<Person>;
  onChange: (v: Partial<Person>) => void;
}) {
  const field = (key: keyof Person, label: string, type = 'text', placeholder = '') => (
    <div>
      <Label className="text-[11px] text-[#8a8894]">{label}</Label>
      <Input
        type={type}
        value={(value[key] as string) || ''}
        onChange={e => onChange({ ...value, [key]: e.target.value })}
        className="bg-[#080810] border-[#2a2a3a] text-[#ede9e0] mt-1 focus:border-[#c9a84c]/60"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4 pt-2">
      {field('firstName', 'Prénom *', 'text', 'Jean')}
      {field('lastName',  'Nom *',    'text', 'Dupont')}
      <div>
        <Label className="text-[11px] text-[#8a8894]">Sexe</Label>
        <select
          value={value.gender || 'M'}
          onChange={e => onChange({ ...value, gender: e.target.value as 'M' | 'F' })}
          className="w-full bg-[#080810] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#ede9e0] mt-1 focus:outline-none focus:border-[#c9a84c]/60"
        >
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </select>
      </div>
      {field('occupation', 'Métier', 'text', 'Cultivateur')}
      {field('birthDate',  'Date de naissance', 'date')}
      {field('birthPlace', 'Lieu de naissance', 'text', 'Paris')}
      {field('deathDate',  'Date de décès', 'date')}
      {field('deathPlace', 'Lieu de décès', 'text', 'Lyon')}
      <div className="col-span-2">
        <Label className="text-[11px] text-[#8a8894]">Notes</Label>
        <textarea
          value={value.notes || ''}
          onChange={e => onChange({ ...value, notes: e.target.value })}
          className="w-full bg-[#080810] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#ede9e0] mt-1 focus:outline-none focus:border-[#c9a84c]/60 resize-none h-20"
          placeholder="Notes de recherche..."
        />
      </div>
    </div>
  );
}

export default function Data() {
  const {
    persons, relations, branches,
    addPerson, updatePerson, deletePerson,
    addRelation, deleteRelation,
    clearAll, resetTree,
    setSelectedPersonId, setViewMode,
  } = useApp();

  const [searchTerm, setSearchTerm]         = useState('');
  const [showAdd, setShowAdd]               = useState(false);
  const [newPerson, setNewPerson]           = useState<Partial<Person>>(EMPTY_PERSON);
  const [editTarget, setEditTarget]         = useState<Person | null>(null);
  const [editForm, setEditForm]             = useState<Partial<Person>>(EMPTY_PERSON);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relFrom, setRelFrom]               = useState('');
  const [relTo, setRelTo]                   = useState('');
  const [relType, setRelType]               = useState<RelationType>('parent');

  const filtered = persons.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const branchColorMap = new Map<string, string>();
  branches.forEach(b => branchColorMap.set(b.id, b.color));

  /* ── Add person ── */
  const handleAdd = () => {
    if (!newPerson.firstName?.trim() || !newPerson.lastName?.trim()) return;
    addPerson({ firstName: newPerson.firstName!, lastName: newPerson.lastName!, gender: newPerson.gender || 'M',
      birthDate: newPerson.birthDate, birthPlace: newPerson.birthPlace,
      deathDate: newPerson.deathDate, deathPlace: newPerson.deathPlace,
      occupation: newPerson.occupation, notes: newPerson.notes });
    setShowAdd(false);
    setNewPerson(EMPTY_PERSON);
  };

  /* ── Edit person ── */
  const openEdit = (p: Person) => { setEditTarget(p); setEditForm({ ...p }); };
  const handleEdit = () => {
    if (!editTarget || !editForm.firstName?.trim() || !editForm.lastName?.trim()) return;
    updatePerson(editTarget.id, editForm);
    setEditTarget(null);
  };

  /* ── Add relation ── */
  const handleAddRelation = () => {
    if (!relFrom || !relTo || relFrom === relTo) return;
    addRelation({ from: relFrom, to: relTo, type: relType });
    setShowAddRelation(false);
    setRelFrom(''); setRelTo(''); setRelType('parent');
  };

  const getRelations = (id: string) =>
    relations.filter(r => r.from === id || r.to === id);

  const personName = (id: string) => {
    const p = persons.find(x => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : id;
  };

  const dialogCls = "bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0] max-w-lg";
  const thCls = "text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium";

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-[#080810] p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-semibold text-[#ede9e0]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Données
          </h1>
          <p className="text-[13px] text-[#8a8894] mt-1">{persons.length} personne{persons.length !== 1 ? 's' : ''} · {relations.length} relation{relations.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5864]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="bg-[#14141c] border border-[#2a2a3a] rounded-lg pl-9 pr-4 py-2 text-[12px] text-[#ede9e0] placeholder-[#5a5864] focus:outline-none focus:border-[#c9a84c]/50 w-48"
            />
          </div>

          {/* Add Person */}
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-[#c9a84c] text-[#080810] hover:bg-[#e0c97f] text-[12px] font-medium">
                <Plus size={14} className="mr-1.5" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className={dialogCls}>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Cormorant Garamond, serif' }}>Nouvelle personne</DialogTitle>
              </DialogHeader>
              <PersonForm value={newPerson} onChange={setNewPerson} />
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAdd(false)} className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28] hover:text-[#ede9e0]">Annuler</Button>
                <Button onClick={handleAdd} className="bg-[#c9a84c] text-[#080810] hover:bg-[#e0c97f]">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Relation */}
          <Dialog open={showAddRelation} onOpenChange={setShowAddRelation}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28] hover:text-[#ede9e0] text-[12px]">
                <Link size={14} className="mr-1.5" /> Relier
              </Button>
            </DialogTrigger>
            <DialogContent className={dialogCls}>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Cormorant Garamond, serif' }}>Ajouter une relation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Personne 1</Label>
                  <select value={relFrom} onChange={e => setRelFrom(e.target.value)}
                    className="w-full bg-[#080810] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#ede9e0] mt-1 focus:outline-none focus:border-[#c9a84c]/60">
                    <option value="">— Sélectionner —</option>
                    {persons.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Type de lien</Label>
                  <select value={relType} onChange={e => setRelType(e.target.value as RelationType)}
                    className="w-full bg-[#080810] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#ede9e0] mt-1 focus:outline-none focus:border-[#c9a84c]/60">
                    {RELATION_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Personne 2</Label>
                  <select value={relTo} onChange={e => setRelTo(e.target.value)}
                    className="w-full bg-[#080810] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#ede9e0] mt-1 focus:outline-none focus:border-[#c9a84c]/60">
                    <option value="">— Sélectionner —</option>
                    {persons.filter(p => p.id !== relFrom).map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddRelation(false)} className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28] hover:text-[#ede9e0]">Annuler</Button>
                <Button onClick={handleAddRelation} className="bg-[#c9a84c] text-[#080810] hover:bg-[#e0c97f]" disabled={!relFrom || !relTo || relFrom === relTo}>Créer le lien</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Clear all */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 text-[12px]">
                <Trash2 size={14} className="mr-1.5" /> Vider
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0]">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400" /> Vider toutes les données
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#8a8894]">
                  Toutes les personnes et relations seront supprimées définitivement. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28]">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll} className="bg-red-700 hover:bg-red-600 text-white">Tout supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Reset to sample */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-[#2a2a3a] text-[#5a5864] hover:bg-[#1e1e28] hover:text-[#8a8894] text-[12px]">
                <RotateCcw size={14} className="mr-1.5" /> Exemple
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0]">
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurer les données d'exemple ?</AlertDialogTitle>
                <AlertDialogDescription className="text-[#8a8894]">
                  Tes données actuelles seront remplacées par les données d'exemple.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28]">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={resetTree} className="bg-[#c9a84c] text-[#080810] hover:bg-[#e0c97f]">Restaurer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Persons table */}
      <div className="bg-[#0d0d18] border border-[#2a2a3a] rounded-xl overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a3a]">
              <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Nom</th>
              <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Naissance</th>
              <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Décès</th>
              <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Métier</th>
              <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Relations</th>
              <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(person => (
              <tr key={person.id} className="border-b border-[#2a2a3a]/40 hover:bg-[#14141c] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold text-[#080810] flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${person.branch ? branchColorMap.get(person.branch) || '#c9a84c' : '#8a8894'}, #b87333)`, fontFamily: 'JetBrains Mono, monospace' }}>
                      {person.firstName[0]}{person.lastName[0]}
                    </div>
                    <div>
                      <p className="text-[12px] text-[#ede9e0] font-medium">{person.firstName} {person.lastName}</p>
                      <p className="text-[10px] text-[#5a5864]">{person.gender === 'M' ? 'Homme' : 'Femme'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {person.birthDate ? (
                    <div>
                      <p className="text-[12px] text-[#ede9e0]">{person.birthDate.split('-').reverse().join('/')}</p>
                      {person.birthPlace && <p className="text-[10px] text-[#5a5864]">{person.birthPlace}</p>}
                    </div>
                  ) : <span className="text-[12px] text-[#5a5864]">—</span>}
                </td>
                <td className="px-4 py-3">
                  {person.deathDate ? (
                    <div>
                      <p className="text-[12px] text-[#ede9e0]">{person.deathDate.split('-').reverse().join('/')}</p>
                      {person.deathPlace && <p className="text-[10px] text-[#5a5864]">{person.deathPlace}</p>}
                    </div>
                  ) : <span className="text-[12px] text-[#5a5864]">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[12px] text-[#8a8894]">{person.occupation || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[12px] text-[#c9a84c]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {getRelations(person.id).length}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedPersonId(person.id); setViewMode('tree'); window.dispatchEvent(new CustomEvent('geneagraph:selectPerson', { detail: person.id })); }}
                      className="text-[11px] text-[#c9a84c] hover:text-[#e0c97f] transition-colors">
                      Voir
                    </button>
                    <span className="text-[#2a2a3a]">·</span>
                    <button onClick={() => openEdit(person)} className="text-[#8a8894] hover:text-[#ede9e0] transition-colors">
                      <Pencil size={13} />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-[#5a5864] hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer {person.firstName} {person.lastName} ?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[#8a8894]">
                            Cette personne et toutes ses relations seront supprimées définitivement.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28]">Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePerson(person.id)} className="bg-red-700 hover:bg-red-600 text-white">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[13px] text-[#5a5864]">
              {persons.length === 0 ? 'Aucune personne. Clique sur « Ajouter » pour commencer ton arbre.' : 'Aucun résultat.'}
            </p>
          </div>
        )}
      </div>

      {/* Relations table */}
      {relations.length > 0 && (
        <div>
          <h2 className="text-[18px] font-semibold text-[#ede9e0] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Relations ({relations.length})
          </h2>
          <div className="bg-[#0d0d18] border border-[#2a2a3a] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a3a]">
                  <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Personne 1</th>
                  <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Type</th>
                  <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Personne 2</th>
                  <th className={thCls} style={{ fontFamily: 'JetBrains Mono, monospace' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {relations.map(rel => {
                  const rt = RELATION_TYPES.find(r => r.value === rel.type);
                  return (
                    <tr key={rel.id} className="border-b border-[#2a2a3a]/40 hover:bg-[#14141c] transition-colors">
                      <td className="px-4 py-2.5 text-[12px] text-[#ede9e0]">{personName(rel.from)}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: rt?.color || '#8a8894' }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rt?.color || '#8a8894' }} />
                          {rt?.label || rel.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[#ede9e0]">{personName(rel.to)}</td>
                      <td className="px-4 py-2.5">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-[#5a5864] hover:text-red-400 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette relation ?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#8a8894]">
                                {personName(rel.from)} · {rt?.label} · {personName(rel.to)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28]">Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRelation(rel.id)} className="bg-red-700 hover:bg-red-600 text-white">Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
        <DialogContent className={dialogCls}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Modifier {editTarget?.firstName} {editTarget?.lastName}
            </DialogTitle>
          </DialogHeader>
          <PersonForm value={editForm} onChange={setEditForm} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditTarget(null)} className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28] hover:text-[#ede9e0]">Annuler</Button>
            <Button onClick={handleEdit} className="bg-[#c9a84c] text-[#080810] hover:bg-[#e0c97f]">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
