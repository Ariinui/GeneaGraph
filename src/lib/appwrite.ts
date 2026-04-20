import { Client, Account, Databases, ID, Query, type Models } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'geneagraph';

export const PERSONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PERSONS_COLLECTION || 'persons';
export const RELATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_RELATIONS_COLLECTION || 'relations';

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const db = {
  id: DATABASE_ID,
  persons: PERSONS_COLLECTION_ID,
  relations: RELATIONS_COLLECTION_ID,
};

export { ID, Query };

export type Document = Models.Document;
