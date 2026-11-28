import type { AnnotationRow, AppDb, ImportedBookRow, UserCollectionRow } from '../db';

const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Amarillo', css: '#f4d35e' },
  { id: 'green', label: 'Verde', css: '#8fd18f' },
  { id: 'blue', label: 'Azul', css: '#8ec5f4' },
  { id: 'pink', label: 'Rosa', css: '#f4a6c8' },
] as const;
export const colorCss = (id?: string) => HIGHLIGHT_COLORS.find((c) => c.id === id)?.css ?? HIGHLIGHT_COLORS[0].css;

export async function listBooks(db: AppDb): Promise<ImportedBookRow[]> {
  return (await db.importedBooks.orderBy('updatedAt').toArray()).reverse();
}

export async function updateBook(db: AppDb, id: string, patch: Partial<Pick<ImportedBookRow, 'title' | 'author' | 'language' | 'description' | 'coverBlob'>>) {
  const clean = <T,>(v: T) => (typeof v === 'string' ? (v.trim() || undefined) : v);
  await db.importedBooks.update(id, { ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, clean(v)])), updatedAt: now() });
}

/** Guarda la posición sin tocar `updatedAt` (que ordena la lista por actividad de edición). */
export async function savePosition(db: AppDb, id: string, position: string, progress: number) {
  await db.importedBooks.update(id, { position, progress: Math.max(0, Math.min(1, progress)) });
}

/** Elimina el libro, su archivo, sus anotaciones y su pertenencia a colecciones. */
export async function deleteBook(db: AppDb, id: string) {
  await db.transaction('rw', db.importedBooks, db.bookFiles, db.annotations, db.userCollections, async () => {
    await db.importedBooks.delete(id);
    await db.bookFiles.delete(id);
    await db.annotations.where('bookId').equals(id).delete();
    const key = `book:${id}`;
    for (const c of await db.userCollections.where('kind').equals('books').toArray()) {
      if (c.items.includes(key)) await db.userCollections.update(c.id, { items: c.items.filter((k) => k !== key), updatedAt: now() });
    }
  });
}

export async function totalBookBytes(db: AppDb): Promise<number> {
  let n = 0;
  await db.importedBooks.each((b) => void (n += b.bytes));
  return n;
}

// ── Anotaciones ──

export async function listAnnotations(db: AppDb, bookId: string): Promise<AnnotationRow[]> {
  return db.annotations.where('bookId').equals(bookId).sortBy('createdAt');
}
export async function addAnnotation(db: AppDb, a: Pick<AnnotationRow, 'bookId' | 'kind' | 'locator'> & Partial<Pick<AnnotationRow, 'text' | 'note' | 'color'>>): Promise<AnnotationRow> {
  const t = now();
  const row: AnnotationRow = { id: uuid(), createdAt: t, updatedAt: t, ...a };
  await db.annotations.put(row);
  return row;
}
export async function updateAnnotation(db: AppDb, id: string, patch: Partial<Pick<AnnotationRow, 'note' | 'color' | 'text'>>) {
  await db.annotations.update(id, { ...patch, updatedAt: now() });
}
export const deleteAnnotation = (db: AppDb, id: string) => db.annotations.delete(id);

// ── Colecciones de libros ──

export async function listBookCollections(db: AppDb): Promise<UserCollectionRow[]> {
  return db.userCollections.where('kind').equals('books').sortBy('title');
}
export async function createBookCollection(db: AppDb, title: string): Promise<UserCollectionRow> {
  const t = now();
  const row: UserCollectionRow = { id: `col:${uuid()}`, kind: 'books', title: title.trim() || 'Colección', items: [], createdAt: t, updatedAt: t };
  await db.userCollections.put(row);
  return row;
}
export const renameCollection = (db: AppDb, id: string, title: string) => db.userCollections.update(id, { title: title.trim() || 'Colección', updatedAt: now() });
export const deleteCollection = (db: AppDb, id: string) => db.userCollections.delete(id);
export async function toggleBookInCollection(db: AppDb, collectionId: string, bookId: string) {
  const c = await db.userCollections.get(collectionId);
  if (!c) return;
  const key = `book:${bookId}`;
  await db.userCollections.update(collectionId, { items: c.items.includes(key) ? c.items.filter((k) => k !== key) : [...c.items, key], updatedAt: now() });
}
