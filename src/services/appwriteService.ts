import { databases, Query, db } from '@/lib/appwrite';
import type { Person, Relation } from '@/types/genealogy';

type Doc = Record<string, any>;

const PERSONS_COLLECTION = db.persons;
const RELATIONS_COLLECTION = db.relations;

function documentToPerson(doc: Doc): Person {
  return {
    id: doc.$id,
    firstName: doc.firstName || '',
    lastName: doc.lastName || '',
    gender: doc.gender || 'M',
    birthDate: doc.birthDate || undefined,
    birthPlace: doc.birthPlace || undefined,
    deathDate: doc.deathDate || undefined,
    deathPlace: doc.deathPlace || undefined,
    occupation: doc.occupation || undefined,
    notes: doc.notes || undefined,
    branch: doc.branch || undefined,
    generation: doc.generation || undefined,
  };
}

function personToDocument(person: Omit<Person, 'id'>): Record<string, unknown> {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    gender: person.gender,
    birthDate: person.birthDate || null,
    birthPlace: person.birthPlace || null,
    deathDate: person.deathDate || null,
    deathPlace: person.deathPlace || null,
    occupation: person.occupation || null,
    notes: person.notes || null,
    branch: person.branch || null,
    generation: person.generation || null,
  };
}

function documentToRelation(doc: Doc): Relation {
  return {
    id: doc.$id,
    from: doc.from,
    to: doc.to,
    type: doc.type,
    label: doc.label || undefined,
    source: doc.source || undefined,
  };
}

function relationToDocument(relation: Relation): Record<string, unknown> {
  return {
    from: relation.from,
    to: relation.to,
    type: relation.type,
    label: relation.label || null,
    source: relation.source || null,
  };
}

export const appwriteService = {
  async getPersons(): Promise<Person[]> {
    try {
      const response = await databases.listDocuments(db.id, PERSONS_COLLECTION);
      return response.documents.map(documentToPerson);
    } catch (error) {
      console.error('Error fetching persons:', error);
      return [];
    }
  },

  async addPerson(person: Person): Promise<Person | null> {
    try {
      const doc = await databases.createDocument(
        db.id,
        PERSONS_COLLECTION,
        person.id,
        personToDocument(person)
      );
      return documentToPerson(doc);
    } catch (error) {
      console.error('Error adding person:', error);
      return null;
    }
  },

  async updatePerson(id: string, updates: Partial<Omit<Person, 'id'>>): Promise<boolean> {
    try {
      const data: Record<string, unknown> = {};
      if (updates.firstName !== undefined) data.firstName = updates.firstName;
      if (updates.lastName !== undefined) data.lastName = updates.lastName;
      if (updates.gender !== undefined) data.gender = updates.gender;
      if (updates.birthDate !== undefined) data.birthDate = updates.birthDate || null;
      if (updates.birthPlace !== undefined) data.birthPlace = updates.birthPlace || null;
      if (updates.deathDate !== undefined) data.deathDate = updates.deathDate || null;
      if (updates.deathPlace !== undefined) data.deathPlace = updates.deathPlace || null;
      if (updates.occupation !== undefined) data.occupation = updates.occupation || null;
      if (updates.notes !== undefined) data.notes = updates.notes || null;
      if (updates.branch !== undefined) data.branch = updates.branch || null;
      if (updates.generation !== undefined) data.generation = updates.generation || null;

      await databases.updateDocument(db.id, PERSONS_COLLECTION, id, data);
      return true;
    } catch (error) {
      console.error('Error updating person:', error);
      return false;
    }
  },

  async deletePerson(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(db.id, PERSONS_COLLECTION, id);
      return true;
    } catch (error) {
      console.error('Error deleting person:', error);
      return false;
    }
  },

  async getRelations(): Promise<Relation[]> {
    try {
      const response = await databases.listDocuments(db.id, RELATIONS_COLLECTION);
      return response.documents.map(documentToRelation);
    } catch (error) {
      console.error('Error fetching relations:', error);
      return [];
    }
  },

  async addRelation(relation: Relation): Promise<Relation | null> {
    try {
      const doc = await databases.createDocument(
        db.id,
        RELATIONS_COLLECTION,
        relation.id,
        relationToDocument(relation)
      );
      return documentToRelation(doc);
    } catch (error) {
      console.error('Error adding relation:', error);
      return null;
    }
  },

  async deleteRelation(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(db.id, RELATIONS_COLLECTION, id);
      return true;
    } catch (error) {
      console.error('Error deleting relation:', error);
      return false;
    }
  },

  async deleteRelationsForPerson(personId: string): Promise<void> {
    try {
      const response = await databases.listDocuments(
        db.id,
        RELATIONS_COLLECTION,
        [
          Query.or([
            Query.equal('from', personId),
            Query.equal('to', personId),
          ]),
        ]
      );

      await Promise.all(
        response.documents.map(doc => 
          databases.deleteDocument(db.id, RELATIONS_COLLECTION, doc.$id)
        )
      );
    } catch (error) {
      console.error('Error deleting relations for person:', error);
    }
  },

  async clearAll(): Promise<boolean> {
    try {
      const [persons, relations] = await Promise.all([
        this.getPersons(),
        this.getRelations(),
      ]);

      await Promise.all([
        ...persons.map(p => this.deletePerson(p.id)),
        ...relations.map(r => this.deleteRelation(r.id)),
      ]);

      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  },

  async loadData(): Promise<{ persons: Person[]; relations: Relation[] }> {
    const [persons, relations] = await Promise.all([
      this.getPersons(),
      this.getRelations(),
    ]);
    return { persons, relations };
  },

  async syncAll(persons: Person[], relations: Relation[]): Promise<void> {
    await this.clearAll();
    await Promise.all(persons.map(p => this.addPerson(p)));
    await Promise.all(relations.map(r => this.addRelation(r)));
  },
};
