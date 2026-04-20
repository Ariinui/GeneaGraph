import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronRight, ChevronLeft, Calendar, Briefcase, FileText, Users, GitBranch, Eye, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Person } from '@/types/genealogy';

export default function PersonPanel() {
  const {
    persons,
    selectedPersonId,
    setSelectedPersonId,
    panelOpen,
    togglePanel,
    getConnectedPersons,
    getPersonSources,
    branches,
    getShortestPath,
    setHighlightedPath,
    updatePerson,
    deletePerson,
  } = useApp();

  const [editOpen, setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm]   = useState<Partial<Person>>({});

  const person = persons.find((p) => p.id === selectedPersonId);

  const branchColorMap = new Map<string, string>();
  branches.forEach((b) => branchColorMap.set(b.id, b.color));

  const handlePersonClick = (pid: string) => {
    setSelectedPersonId(pid);
    window.dispatchEvent(new CustomEvent('geneagraph:selectPerson', { detail: pid }));
  };

  const openEdit = () => { setEditForm({ ...person }); setEditOpen(true); };
  const handleEdit = () => {
    if (!person || !editForm.firstName?.trim() || !editForm.lastName?.trim()) return;
    updatePerson(person.id, editForm);
    setEditOpen(false);
  };
  const handleDelete = () => {
    if (!person) return;
    deletePerson(person.id);
    setSelectedPersonId(null);
    setDeleteOpen(false);
  };

  const handleFindPath = (targetId: string) => {
    if (!selectedPersonId) return;
    const path = getShortestPath(selectedPersonId, targetId);
    if (path.length > 0) {
      setHighlightedPath(path);
    }
  };

  if (!panelOpen) {
    return (
      <button
        onClick={togglePanel}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 w-8 h-16 bg-[#14141c] border border-r-0 border-[#2a2a3a] rounded-l-lg flex items-center justify-center text-[#8a8894] hover:text-[#c9a84c] transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
    );
  }

  return (
    <aside className="w-[380px] min-w-[380px] h-screen bg-[#0a0a0f] border-l border-[#2a2a3a] flex flex-col overflow-hidden relative">
      {/* Toggle button */}
      <button
        onClick={togglePanel}
        className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-50 w-8 h-16 bg-[#14141c] border border-r-0 border-[#2a2a3a] rounded-l-lg flex items-center justify-center text-[#8a8894] hover:text-[#c9a84c] transition-colors"
      >
        <ChevronRight size={16} />
      </button>

      {!person ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#14141c] border border-[#2a2a3a] flex items-center justify-center mb-4">
            <Users size={24} className="text-[#2a2a3a]" />
          </div>
          <p className="text-[14px] text-[#8a8894] mb-2">Sélectionnez une personne sur le graphe</p>
          <p className="text-[12px] text-[#5a5864]">Cliquez sur un nœud pour voir sa fiche détaillée</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#2a2a3a]">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-[#0a0a0f] font-semibold text-[18px] flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${person.branch ? branchColorMap.get(person.branch) || '#c9a84c' : '#8a8894'}, #b87333)`,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {person.firstName[0]}{person.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[18px] font-semibold text-[#e8e6e1] leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {person.firstName} {person.lastName}
                  </h2>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={openEdit} className="p-1.5 rounded-md text-[#8a8894] hover:text-[#c9a84c] hover:bg-[#1e1e28] transition-colors" title="Modifier">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteOpen(true)} className="p-1.5 rounded-md text-[#8a8894] hover:text-red-400 hover:bg-[#1e1e28] transition-colors" title="Supprimer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-[#8a8894] mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {person.birthDate?.split('-')[0] || '?'} — {person.deathDate?.split('-')[0] || '?'}
                </p>
                {person.branch && (
                  <span
                    className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-[#0a0a0f]"
                    style={{ backgroundColor: branchColorMap.get(person.branch) || '#c9a84c' }}
                  >
                    {branches.find((b) => b.id === person.branch)?.name || person.branch}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Informations */}
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Informations
            </h3>
            <div className="space-y-2.5">
              {person.birthDate && (
                <div className="flex items-start gap-2.5">
                  <Calendar size={13} className="text-[#c9a84c] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-[#5a5864]">Naissance</p>
                    <p className="text-[13px] text-[#e8e6e1]">
                      {person.birthDate.split('-').reverse().join('/')}
                      {person.birthPlace && ` — ${person.birthPlace}`}
                    </p>
                  </div>
                </div>
              )}
              {person.deathDate && (
                <div className="flex items-start gap-2.5">
                  <Calendar size={13} className="text-[#f43f5e] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-[#5a5864]">Décès</p>
                    <p className="text-[13px] text-[#e8e6e1]">
                      {person.deathDate.split('-').reverse().join('/')}
                      {person.deathPlace && ` — ${person.deathPlace}`}
                    </p>
                  </div>
                </div>
              )}
              {person.occupation && (
                <div className="flex items-start gap-2.5">
                  <Briefcase size={13} className="text-[#10b981] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-[#5a5864]">Métier</p>
                    <p className="text-[13px] text-[#e8e6e1]">{person.occupation}</p>
                  </div>
                </div>
              )}
              {person.generation && (
                <div className="flex items-start gap-2.5">
                  <GitBranch size={13} className="text-[#8b5cf6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-[#5a5864]">Génération</p>
                    <p className="text-[13px] text-[#e8e6e1]">{person.generation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Relations */}
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Relations
            </h3>
            <div className="space-y-2">
              {getConnectedPersons(person.id).map(({ person: connectedPerson, relation }) => (
                <div
                  key={relation.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-[#14141c] border border-[#2a2a3a] hover:border-[#5a5864] transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#0a0a0f] flex-shrink-0 cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${connectedPerson.branch ? branchColorMap.get(connectedPerson.branch) || '#c9a84c' : '#8a8894'}, #b87333)`,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    onClick={() => handlePersonClick(connectedPerson.id)}
                  >
                    {connectedPerson.firstName[0]}{connectedPerson.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePersonClick(connectedPerson.id)}>
                    <p className="text-[12px] text-[#e8e6e1] font-medium truncate group-hover:text-[#c9a84c] transition-colors">
                      {connectedPerson.firstName} {connectedPerson.lastName}
                    </p>
                    <p className="text-[10px] text-[#5a5864]">
                      {relation.label || getRelationLabel(relation.type)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleFindPath(connectedPerson.id)}
                    className="p-1 rounded text-[#5a5864] hover:text-[#c9a84c] hover:bg-[#1e1e28] transition-colors"
                    title="Trouver le chemin"
                  >
                    <Eye size={12} />
                  </button>
                </div>
              ))}
              {getConnectedPersons(person.id).length === 0 && (
                <p className="text-[12px] text-[#5a5864] italic">Aucune relation enregistrée</p>
              )}
            </div>
          </div>

          {/* Sources */}
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Sources
            </h3>
            <div className="space-y-2">
              {getPersonSources(person.id).map((source) => (
                <div
                  key={source.id}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-[#14141c] border border-[#2a2a3a]"
                >
                  <FileText size={13} className="text-[#c9a84c] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] text-[#e8e6e1]">{source.title}</p>
                    {source.reference && (
                      <p className="text-[10px] text-[#5a5864]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {source.reference}
                      </p>
                    )}
                    {source.date && (
                      <p className="text-[10px] text-[#8a8894]">{source.date}</p>
                    )}
                  </div>
                </div>
              ))}
              {getPersonSources(person.id).length === 0 && (
                <p className="text-[12px] text-[#5a5864] italic">Aucune source enregistrée</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {person.notes && (
            <div className="px-6 py-4">
              <h3 className="text-[10px] font-medium text-[#5a5864] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Notes
              </h3>
              <p className="text-[12px] text-[#8a8894] leading-relaxed bg-[#14141c] rounded-lg p-3 border border-[#2a2a3a]">
                {person.notes}
              </p>
            </div>
          )}

          <div className="h-6" />
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0] max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Cormorant Garamond, serif' }}>Modifier {person?.firstName} {person?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {([['firstName','Prénom','Jean'],['lastName','Nom','Dupont'],['occupation','Métier','Cultivateur'],['birthPlace','Lieu naissance','Paris'],['deathPlace','Lieu décès','Lyon']] as [keyof Person, string, string][]).map(([key, label, ph]) => (
              <div key={key}>
                <Label className="text-[11px] text-[#8a8894]">{label}</Label>
                <Input value={(editForm[key] as string) || ''} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  className="bg-[#080810] border-[#2a2a3a] text-[#ede9e0] mt-1" placeholder={ph} />
              </div>
            ))}
            <div>
              <Label className="text-[11px] text-[#8a8894]">Sexe</Label>
              <select value={editForm.gender || 'M'} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value as 'M'|'F' }))}
                className="w-full bg-[#080810] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#ede9e0] mt-1 focus:outline-none">
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px] text-[#8a8894]">Date naissance</Label>
              <Input type="date" value={(editForm.birthDate as string) || ''} onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))}
                className="bg-[#080810] border-[#2a2a3a] text-[#ede9e0] mt-1" />
            </div>
            <div>
              <Label className="text-[11px] text-[#8a8894]">Date décès</Label>
              <Input type="date" value={(editForm.deathDate as string) || ''} onChange={e => setEditForm(f => ({ ...f, deathDate: e.target.value }))}
                className="bg-[#080810] border-[#2a2a3a] text-[#ede9e0] mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] text-[#8a8894]">Notes</Label>
              <textarea value={(editForm.notes as string) || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-[#080810] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#ede9e0] mt-1 focus:outline-none resize-none h-16" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28]">Annuler</Button>
            <Button onClick={handleEdit} className="bg-[#c9a84c] text-[#080810] hover:bg-[#e0c97f]">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#0f0f1a] border-[#2a2a3a] text-[#ede9e0]">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {person?.firstName} {person?.lastName} ?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8a8894]">Cette personne et toutes ses relations seront supprimées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28]">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-700 hover:bg-red-600 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

function getRelationLabel(type: string): string {
  switch (type) {
    case 'parent': return 'Parenté';
    case 'alliance': return 'Alliance';
    case 'witness': return 'Témoin';
    case 'godparent': return 'Parrainage';
    default: return type;
  }
}
