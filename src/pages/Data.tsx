import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Upload, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Person } from '@/types/genealogy';

export default function Data() {
  const { persons, relations, branches, addPerson, setSelectedPersonId, setViewMode } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPerson, setNewPerson] = useState<Partial<Person>>({
    gender: 'M',
  });

  const filteredPersons = persons.filter((p) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const branchColorMap = new Map<string, string>();
  branches.forEach((b) => branchColorMap.set(b.id, b.color));

  const handleAddPerson = () => {
    if (!newPerson.firstName || !newPerson.lastName) return;
    addPerson({
      firstName: newPerson.firstName,
      lastName: newPerson.lastName,
      gender: newPerson.gender || 'M',
      birthDate: newPerson.birthDate,
      birthPlace: newPerson.birthPlace,
      deathDate: newPerson.deathDate,
      deathPlace: newPerson.deathPlace,
      occupation: newPerson.occupation,
      notes: newPerson.notes,
    });
    setShowAddForm(false);
    setNewPerson({ gender: 'M' });
  };

  const handleRowClick = (personId: string) => {
    setSelectedPersonId(personId);
    setViewMode('tree');
    window.dispatchEvent(new CustomEvent('geneagraph:selectPerson', { detail: personId }));
  };

  const getRelationCount = (personId: string) => {
    return relations.filter((r) => r.from === personId || r.to === personId).length;
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-[#0a0a0f] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Données
          </h1>
          <p className="text-[13px] text-[#8a8894] mt-1">{persons.length} personnes enregistrées</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5864]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="bg-[#14141c] border border-[#2a2a3a] rounded-lg pl-9 pr-4 py-2 text-[12px] text-[#e8e6e1] placeholder-[#5a5864] focus:outline-none focus:border-[#c9a84c]/50 w-56"
            />
          </div>
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button className="bg-[#c9a84c] text-[#0a0a0f] hover:bg-[#e0c97f] text-[12px] font-medium">
                <Plus size={14} className="mr-1.5" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#14141c] border-[#2a2a3a] text-[#e8e6e1] max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-[#e8e6e1]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  Nouvelle personne
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Prénom</Label>
                  <Input
                    value={newPerson.firstName || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, firstName: e.target.value })}
                    className="bg-[#0a0a0f] border-[#2a2a3a] text-[#e8e6e1] mt-1"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Nom</Label>
                  <Input
                    value={newPerson.lastName || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, lastName: e.target.value })}
                    className="bg-[#0a0a0f] border-[#2a2a3a] text-[#e8e6e1] mt-1"
                    placeholder="Dupont"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Sexe</Label>
                  <select
                    value={newPerson.gender}
                    onChange={(e) => setNewPerson({ ...newPerson, gender: e.target.value as 'M' | 'F' })}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#e8e6e1] mt-1 focus:outline-none focus:border-[#c9a84c]/50"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Métier</Label>
                  <Input
                    value={newPerson.occupation || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, occupation: e.target.value })}
                    className="bg-[#0a0a0f] border-[#2a2a3a] text-[#e8e6e1] mt-1"
                    placeholder="Cultivateur"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Date de naissance</Label>
                  <Input
                    type="date"
                    value={newPerson.birthDate || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, birthDate: e.target.value })}
                    className="bg-[#0a0a0f] border-[#2a2a3a] text-[#e8e6e1] mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Lieu de naissance</Label>
                  <Input
                    value={newPerson.birthPlace || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, birthPlace: e.target.value })}
                    className="bg-[#0a0a0f] border-[#2a2a3a] text-[#e8e6e1] mt-1"
                    placeholder="Paris"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Date de décès</Label>
                  <Input
                    type="date"
                    value={newPerson.deathDate || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, deathDate: e.target.value })}
                    className="bg-[#0a0a0f] border-[#2a2a3a] text-[#e8e6e1] mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-[#8a8894]">Lieu de décès</Label>
                  <Input
                    value={newPerson.deathPlace || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, deathPlace: e.target.value })}
                    className="bg-[#0a0a0f] border-[#2a2a3a] text-[#e8e6e1] mt-1"
                    placeholder="Lyon"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px] text-[#8a8894]">Notes</Label>
                  <textarea
                    value={newPerson.notes || ''}
                    onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                    className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-md px-3 py-2 text-[12px] text-[#e8e6e1] mt-1 focus:outline-none focus:border-[#c9a84c]/50 resize-none h-20"
                    placeholder="Notes de recherche..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28] hover:text-[#e8e6e1]"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddPerson}
                  className="bg-[#c9a84c] text-[#0a0a0f] hover:bg-[#e0c97f]"
                >
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="border-[#2a2a3a] text-[#8a8894] hover:bg-[#1e1e28] hover:text-[#e8e6e1] text-[12px]">
            <Upload size={14} className="mr-1.5" />
            Importer GEDCOM
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#14141c] border border-[#2a2a3a] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a3a]">
              <th className="text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Nom
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Naissance
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Décès
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Métier
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Relations
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Branche
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#5a5864] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPersons.map((person) => (
              <tr
                key={person.id}
                className="border-b border-[#2a2a3a]/50 hover:bg-[#1e1e28] transition-colors cursor-pointer"
                onClick={() => handleRowClick(person.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold text-[#0a0a0f] flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${person.branch ? branchColorMap.get(person.branch) || '#c9a84c' : '#8a8894'}, #b87333)`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {person.firstName[0]}{person.lastName[0]}
                    </div>
                    <div>
                      <p className="text-[12px] text-[#e8e6e1] font-medium">{person.firstName} {person.lastName}</p>
                      <p className="text-[10px] text-[#5a5864]">{person.gender === 'M' ? 'Homme' : 'Femme'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {person.birthDate ? (
                    <div>
                      <p className="text-[12px] text-[#e8e6e1]">{person.birthDate.split('-').reverse().join('/')}</p>
                      {person.birthPlace && <p className="text-[10px] text-[#5a5864]">{person.birthPlace}</p>}
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#5a5864]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {person.deathDate ? (
                    <div>
                      <p className="text-[12px] text-[#e8e6e1]">{person.deathDate.split('-').reverse().join('/')}</p>
                      {person.deathPlace && <p className="text-[10px] text-[#5a5864]">{person.deathPlace}</p>}
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#5a5864]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[12px] text-[#8a8894]">{person.occupation || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[12px] text-[#c9a84c]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {getRelationCount(person.id)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {person.branch ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium text-[#0a0a0f]"
                      style={{ backgroundColor: branchColorMap.get(person.branch) || '#c9a84c' }}
                    >
                      {branches.find((b) => b.id === person.branch)?.name || person.branch}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#5a5864]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(person.id);
                    }}
                    className="text-[11px] text-[#c9a84c] hover:text-[#e0c97f] transition-colors"
                  >
                    Voir sur le graphe
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPersons.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[13px] text-[#5a5864]">Aucune personne trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
