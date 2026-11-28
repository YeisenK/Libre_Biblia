// @vitest-environment jsdom
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { describe, expect, it } from 'vitest';

// fake-indexeddb clona con structuredClone de Node: necesita Blob/File de Node (el de jsdom no se serializa).
globalThis.Blob = NodeBlob as unknown as typeof Blob;
globalThis.File = NodeFile as unknown as typeof File;
import JSZip from 'jszip';
import { AppDb } from '../db';
import { detectFormat } from './detect';
import { ImportError } from './errors';
import { epubMetadata, readTextual, textMetadata } from './metadata';
import { MAX_BOOK_BYTES, prepareImport, saveImport } from './import';
import { makeEpub, makePdf, SAMPLE_FB2, SAMPLE_HTML, SAMPLE_MD, SAMPLE_TXT } from './fixtures';
import { searchChapters, splitChapters } from './text';
import { addAnnotation, createBookCollection, deleteBook, listAnnotations, listBookCollections, toggleBookInCollection, totalBookBytes } from './store';
import { exportBackup, importBackup } from '../backup';

const enc = (s: string) => new TextEncoder().encode(s);
const asFile = (data: Uint8Array | string, name: string) => new File([data as BlobPart], name);
let n = 0;

describe('detección de formato', () => {
  it('reconoce por firma de bytes', async () => {
    expect(detectFormat(await makeEpub(), 'x.bin')).toEqual({ format: 'epub' });
    expect(detectFormat(makePdf(), 'sin-extension')).toEqual({ format: 'pdf' });
    expect(detectFormat(enc(SAMPLE_FB2), 'a.xml')).toEqual({ format: 'fb2' });
    expect(detectFormat(enc(SAMPLE_HTML), 'a.txt')).toEqual({ format: 'html' });
  });
  it('usa la extensión para texto', () => {
    expect(detectFormat(enc(SAMPLE_MD), 'notas.md')).toEqual({ format: 'md' });
    expect(detectFormat(enc(SAMPLE_TXT), 'notas.txt')).toEqual({ format: 'txt' });
  });
  it('rechaza binarios, ZIP genéricos y formatos no admitidos', async () => {
    const zip = await new JSZip().file('a.txt', 'hola').generateAsync({ type: 'uint8array' });
    expect(detectFormat(zip, 'a.zip')).toMatchObject({ format: null });
    expect(detectFormat(Uint8Array.from([1, 2, 0, 0, 5]), 'x.dat')).toMatchObject({ format: null });
    expect(detectFormat(new Uint8Array(70).fill(0x20), 'libro.mobi')).toMatchObject({ format: null, reason: expect.stringContaining('mobi') });
  });
});

describe('metadatos', () => {
  it('EPUB: título, autor, idioma y portada', async () => {
    const m = await epubMetadata(await makeEpub({ title: 'Las Moradas', author: 'Teresa de Jesús', language: 'es', withCover: true }), 'm.epub');
    expect(m).toMatchObject({ title: 'Las Moradas', author: 'Teresa de Jesús', language: 'es' });
    expect(m.cover?.type).toBe('image/png');
  });
  it('EPUB sin título usa el nombre de archivo; EPUB dañado y con DRM se rechazan', async () => {
    expect((await epubMetadata(await makeEpub({ title: '' }), 'mi_libro.epub')).title).toBe('mi libro');
    await expect(epubMetadata(enc('PK\x03\x04basura'), 'x.epub')).rejects.toMatchObject({ code: 'corrupt' });
    await expect(epubMetadata(await makeEpub({ drm: true }), 'x.epub')).rejects.toMatchObject({ code: 'drm' });
    const noContainer = await new JSZip().file('mimetype', 'application/epub+zip').generateAsync({ type: 'uint8array' });
    await expect(epubMetadata(noContainer, 'x.epub')).rejects.toBeInstanceOf(ImportError);
  });
  it('Markdown/TXT: título del primer encabezado o del archivo', () => {
    expect(textMetadata(SAMPLE_MD, 'x.md', 'md').title).toBe('Meditaciones breves');
    expect(textMetadata('solo texto sin titulo claro que sea muy largo '.repeat(5), 'mi-nota.txt', 'txt').title).toBe('mi-nota');
    expect(readTextual(enc(SAMPLE_TXT), 'c.txt', 'txt').meta.title).toBe('Camino de perfección');
  });
  it('HTML y FB2: título, autor, idioma; el script no entra en el texto', () => {
    const h = readTextual(enc(SAMPLE_HTML), 'p.html', 'html');
    expect(h.meta).toMatchObject({ title: 'Página de prueba', author: 'Ana Autora', language: 'es' });
    expect(h.md).toContain('**negrita**');
    expect(h.md).not.toContain('alert');
    const f = readTextual(enc(SAMPLE_FB2), 'l.fb2', 'fb2');
    expect(f.meta).toMatchObject({ title: 'Los nombres de Cristo', author: 'Luis de León', language: 'es' });
    expect(f.md).toContain('# Libro primero');
  });
  it('texto ilegible o vacío se rechaza', () => {
    expect(() => readTextual(enc('   \n'), 'v.txt', 'txt')).toThrow(/no contiene texto/);
    expect(() => readTextual(new Uint8Array(200).fill(0x01), 'v.txt', 'txt')).toThrow(ImportError);
  });
});

describe('capítulos y búsqueda', () => {
  it('divide por encabezados y por rótulos «Capítulo»', () => {
    expect(splitChapters(SAMPLE_MD, 'md').map((c) => c.title)).toEqual(['Meditaciones breves', 'Segunda parte']);
    const t = splitChapters(SAMPLE_TXT, 'txt', 'Camino');
    expect(t.map((c) => c.title)).toEqual(['Inicio', 'CAPÍTULO I', 'CAPÍTULO II']);
    expect(searchChapters(t, 'GLORIA')).toMatchObject([{ chapter: 2 }]);
    expect(searchChapters(t, 'humildad')[0]!.excerpt).toContain('humildad');
  });
});

describe('importación y gestión', () => {
  it('prepara, guarda, anota, colecciona y elimina', async () => {
    const db = new AppDb(`test-lib-${n++}`);
    const p = await prepareImport(asFile(await makeEpub(), 'libro.epub'));
    expect(p.format).toBe('epub');
    const row = await saveImport(db, p, { title: 'Mi libro editado', author: '' });
    expect(row).toMatchObject({ title: 'Mi libro editado', format: 'epub', id: expect.stringMatching(/^user:/) });
    expect((await db.bookFiles.get(row.id))?.blob.size).toBeGreaterThan(100);
    expect(await totalBookBytes(db)).toBe(row.bytes);
    await addAnnotation(db, { bookId: row.id, kind: 'highlight', locator: 'epubcfi(/6/2)', text: 'hola', color: 'green' });
    const col = await createBookCollection(db, 'Santos');
    await toggleBookInCollection(db, col.id, row.id);
    expect((await listBookCollections(db))[0]!.items).toEqual([`book:${row.id}`]);
    await deleteBook(db, row.id);
    expect(await db.importedBooks.count()).toBe(0);
    expect(await listAnnotations(db, row.id)).toHaveLength(0);
    expect((await listBookCollections(db))[0]!.items).toEqual([]);
  });
  it('rechaza vacío, demasiado grande y no admitido con mensajes claros', async () => {
    await expect(prepareImport(asFile('', 'a.txt'))).rejects.toMatchObject({ code: 'empty' });
    const big = { size: MAX_BOOK_BYTES + 1, name: 'g.pdf' } as File;
    await expect(prepareImport(big)).rejects.toMatchObject({ code: 'too-large' });
    await expect(prepareImport(asFile(Uint8Array.from([0, 1, 2, 3]), 'a.bin'))).rejects.toMatchObject({ code: 'unsupported' });
  });
  it('la copia de seguridad conserva libros, anotaciones, colecciones y (opcional) archivos', async () => {
    const a = new AppDb(`test-lib-${n++}`);
    const b = new AppDb(`test-lib-${n++}`);
    const row = await saveImport(a, await prepareImport(asFile(enc(SAMPLE_MD), 'm.md')), { title: 'M' });
    await addAnnotation(a, { bookId: row.id, kind: 'note', locator: 'c:0:1', note: 'mi nota' });
    const col = await createBookCollection(a, 'Lecturas');
    await toggleBookInCollection(a, col.id, row.id);
    const sinArchivos = JSON.stringify(await exportBackup(a));
    expect(sinArchivos).not.toContain('"bookFiles"');
    const r1 = await importBackup(b, sinArchivos);
    expect(r1).toMatchObject({ books: 1, annotations: 1, bookCollections: 1, bookFiles: 0 });
    expect(await b.bookFiles.count()).toBe(0);
    const r2 = await importBackup(b, JSON.stringify(await exportBackup(a, { includeBookFiles: true })));
    expect(r2).toMatchObject({ books: 0, bookFiles: 1 });
    expect(await (await b.bookFiles.get(row.id))!.blob.text()).toBe(SAMPLE_MD);
    expect((await b.annotations.toArray())[0]!.note).toBe('mi nota');
    expect((await importBackup(b, sinArchivos)).annotations).toBe(0);
  });
});
