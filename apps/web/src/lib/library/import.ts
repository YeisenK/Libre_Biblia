import type { AppDb, BookFileRow, ImportedBookRow } from '../db';
import { baseName, detectFormat, MIME, type BookFormat } from './detect';
import { ImportError } from './errors';
import { epubMetadata, readTextual, type BookMeta } from './metadata';
import { pdfMetadata } from './pdf';

/** Límite razonable por archivo (el IndexedDB del WebView se queda sin espacio con archivos enormes). */
export const MAX_BOOK_BYTES = 150 * 1024 * 1024;
/** Por encima de este tamaño se avisa antes de guardar. */
export const WARN_BOOK_BYTES = 50 * 1024 * 1024;

export interface PreparedBook {
  file: File;
  format: BookFormat;
  meta: BookMeta;
  bytes: number;
  pages?: number;
  /** Avisos no bloqueantes (archivo grande, poco espacio…). */
  warnings: string[];
}

const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
export const fmtBytes = (n: number) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const readBytes = (f: Blob): Promise<Uint8Array> => (f.arrayBuffer ? f.arrayBuffer().then((b) => new Uint8Array(b)) : new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(new Uint8Array(r.result as ArrayBuffer));
  r.onerror = () => rej(r.error);
  r.readAsArrayBuffer(f);
}));

/** Espacio disponible estimado (null si el navegador no lo informa). */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e?.quota ? { usage: e.usage ?? 0, quota: e.quota } : null;
  } catch {
    return null;
  }
}
/** Pide almacenamiento persistente para que el sistema no borre los libros (mejor esfuerzo). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Detecta el formato, valida que sea legible y extrae metadatos. No escribe nada. */
export async function prepareImport(file: File): Promise<PreparedBook> {
  if (file.size === 0) throw new ImportError('empty', 'El archivo está vacío.');
  if (file.size > MAX_BOOK_BYTES) throw new ImportError('too-large', `El archivo pesa ${fmtBytes(file.size)}; el máximo es ${fmtBytes(MAX_BOOK_BYTES)}.`);
  const data = await readBytes(file);
  const det = detectFormat(data.subarray(0, 4096), file.name);
  if (!det.format) throw new ImportError('unsupported', det.reason);
  const format = det.format;
  const warnings: string[] = [];
  let meta: BookMeta;
  let pages: number | undefined;
  if (format === 'epub') meta = await epubMetadata(data, file.name);
  else if (format === 'pdf') {
    const m = await pdfMetadata(data, file.name);
    pages = m.pages;
    meta = m;
  } else if (format === 'other') throw new ImportError('unsupported', 'Formato no admitido.');
  else meta = readTextual(data, file.name, format).meta;
  if (file.size > WARN_BOOK_BYTES) warnings.push(`Es un archivo grande (${fmtBytes(file.size)}); ocupará ese espacio en el dispositivo.`);
  const est = await storageEstimate();
  if (est && est.quota - est.usage < file.size * 1.5) warnings.push(`Queda poco espacio (${fmtBytes(Math.max(0, est.quota - est.usage))} disponibles). Puede que no se pueda guardar.`);
  return { file, format, meta: { ...meta, title: meta.title || baseName(file.name) }, bytes: file.size, pages, warnings };
}

export interface BookCard {
  title: string;
  author?: string;
  language?: string;
  description?: string;
}

/** Guarda la ficha y el archivo (Blob). Si falla por cuota, no queda nada a medias. */
export async function saveImport(db: AppDb, p: PreparedBook, card: BookCard): Promise<ImportedBookRow> {
  const now = new Date().toISOString();
  const id = `user:${uuid()}`;
  const clean = (s?: string) => s?.trim() || undefined;
  const row: ImportedBookRow = {
    id,
    format: p.format,
    title: clean(card.title) ?? baseName(p.file.name),
    author: clean(card.author),
    language: clean(card.language),
    description: clean(card.description),
    coverBlob: p.meta.cover,
    bytes: p.bytes,
    fileName: p.file.name,
    addedAt: now,
    updatedAt: now,
  };
  const blob = p.file.slice(0, p.file.size, MIME[p.format]);
  const file: BookFileRow = { bookId: id, blob };
  try {
    await db.transaction('rw', db.importedBooks, db.bookFiles, async () => {
      await db.bookFiles.put(file);
      await db.importedBooks.put(row);
    });
  } catch (e) {
    if ((e as { name?: string })?.name === 'QuotaExceededError') throw new ImportError('no-space', 'No hay espacio suficiente en el dispositivo para guardar este libro.');
    throw e;
  }
  return row;
}

export const importErrorMessage = (e: unknown) => (e instanceof ImportError ? e.message : 'No se pudo leer el archivo. Puede estar dañado.');
