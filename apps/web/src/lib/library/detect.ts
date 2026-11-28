import type { ImportedBookRow } from '../db';

export type BookFormat = ImportedBookRow['format'];

export const FORMAT_LABEL: Record<BookFormat, string> = { epub: 'EPUB', pdf: 'PDF', txt: 'Texto', md: 'Markdown', html: 'HTML', fb2: 'FB2', other: 'Otro' };
export const MIME: Record<BookFormat, string> = {
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
  fb2: 'application/x-fictionbook+xml',
  other: 'application/octet-stream',
};
/** Valor de `accept` del selector de archivos (extensiones y tipos MIME). */
export const ACCEPT = '.epub,.pdf,.txt,.md,.markdown,.html,.htm,.xhtml,.fb2,application/epub+zip,application/pdf,text/plain,text/markdown,text/html,application/x-fictionbook+xml';

const ext = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
const ascii = (b: Uint8Array, from: number, to: number) => {
  let s = '';
  for (let i = from; i < Math.min(to, b.length); i++) s += String.fromCharCode(b[i]!);
  return s;
};

/** Resultado de la detección: formato o, si se reconoce algo no admitido, el motivo. */
export type Detection = { format: BookFormat } | { format: null; reason: string };

/**
 * Detecta el formato por la firma de bytes (con la extensión como desempate para texto).
 * `head` son los primeros bytes del archivo (basta con 4 KiB).
 */
export function detectFormat(head: Uint8Array, fileName: string): Detection {
  const e = ext(fileName);
  const start = ascii(head, 0, 1024);
  if (start.includes('%PDF-')) return { format: 'pdf' };
  if (head[0] === 0x50 && head[1] === 0x4b && (head[2] === 0x03 || head[2] === 0x05)) {
    // ZIP: el EPUB declara «mimetype» como primera entrada sin comprimir.
    if (ascii(head, 30, 90).includes('mimetype') && ascii(head, 30, 120).includes('application/epub+zip')) return { format: 'epub' };
    if (e === 'epub') return { format: 'epub' };
    return { format: null, reason: 'Es un archivo comprimido (ZIP) que no es un EPUB.' };
  }
  if (ascii(head, 60, 68) === 'BOOKMOBI' || ascii(head, 60, 68) === 'TEXtREAd') return { format: null, reason: 'El formato MOBI/AZW no está admitido. Conviértelo antes a EPUB.' };
  if (head[0] === 0xd0 && head[1] === 0xcf) return { format: null, reason: 'Los documentos de Word antiguos no están admitidos. Expórtalo a PDF o EPUB.' };
  if (head[0] === 0x7b && head[1] === 0x5c && ascii(head, 0, 5) === '{\\rtf') return { format: null, reason: 'El formato RTF no está admitido. Expórtalo a PDF o EPUB.' };
  // A partir de aquí debe ser texto: un NUL en los primeros bytes indica binario (salvo UTF-16 con BOM).
  const utf16 = (head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff);
  if (!utf16) for (let i = 0; i < Math.min(head.length, 2048); i++) if (head[i] === 0) return { format: null, reason: 'El archivo es binario y no es EPUB ni PDF.' };
  const low = start.toLowerCase();
  if (low.includes('<fictionbook') || (e === 'fb2' && low.includes('<?xml'))) return { format: 'fb2' };
  if (e === 'html' || e === 'htm' || e === 'xhtml' || /<!doctype html|<html[\s>]/.test(low)) return { format: 'html' };
  if (e === 'md' || e === 'markdown') return { format: 'md' };
  if (e === 'txt' || e === '' || e === 'text') return { format: 'txt' };
  if (['doc', 'docx', 'odt', 'rtf', 'mobi', 'azw', 'azw3', 'djvu', 'cbz', 'cbr'].includes(e)) return { format: null, reason: `El formato .${e} no está admitido. Convierte el archivo a EPUB o PDF.` };
  return { format: 'txt' };
}

export const baseName = (fileName: string) => fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').trim();
