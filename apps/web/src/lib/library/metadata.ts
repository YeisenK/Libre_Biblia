import type JSZip from 'jszip';
import { baseName, type BookFormat } from './detect';
import { ImportError } from './errors';
import { decodeText, fb2ToMarkdown, garbageRatio, toMarkdown } from './text';

export interface BookMeta {
  title: string;
  author?: string;
  language?: string;
  description?: string;
  cover?: Blob;
}

const clean = (s?: string | null) => s?.replace(/\s+/g, ' ').trim() || undefined;
const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const byLocal = (root: Document | Element, name: string) => Array.from(root.getElementsByTagName('*')).filter((e) => e.localName === name);
const dirname = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
function resolvePath(base: string, href: string) {
  const parts = (base + decodeURIComponent(href.split('#')[0]!)).split('/');
  const out: string[] = [];
  for (const p of parts) (p === '..' ? out.pop() : p !== '.' && p !== '' && out.push(p));
  return out.join('/');
}

export interface EpubInfo extends BookMeta {
  opfPath: string;
  spine: string[];
}

/** Algoritmos de cifrado que NO son DRM (ofuscación de tipografías). */
const FONT_OBFUSCATION = ['http://www.idpf.org/2008/embedding', 'http://ns.adobe.com/pdf/enc#RC'];

/** Lee el OPF de un EPUB: metadatos, portada y spine. Lanza ImportError si está dañado o protegido. */
export async function readEpub(zip: JSZip): Promise<EpubInfo> {
  const enc = zip.file('META-INF/encryption.xml');
  if (zip.file('META-INF/rights.xml')) throw new ImportError('drm', 'El libro está protegido con DRM y no se puede abrir.');
  if (enc) {
    const algs = byLocal(xml(await enc.async('string')), 'EncryptionMethod').map((e) => e.getAttribute('Algorithm') ?? '');
    if (algs.some((a) => !FONT_OBFUSCATION.includes(a))) throw new ImportError('drm', 'El libro está protegido con DRM y no se puede abrir.');
  }
  const container = zip.file('META-INF/container.xml');
  if (!container) throw new ImportError('corrupt', 'El EPUB está dañado: falta META-INF/container.xml.');
  const rootfile = byLocal(xml(await container.async('string')), 'rootfile')[0]?.getAttribute('full-path');
  const opfFile = rootfile ? zip.file(rootfile) : null;
  if (!rootfile || !opfFile) throw new ImportError('corrupt', 'El EPUB está dañado: no se encuentra el paquete (OPF).');
  const opf = xml(await opfFile.async('string'));
  if (opf.getElementsByTagName('parsererror').length) throw new ImportError('corrupt', 'El EPUB está dañado: el OPF no es válido.');
  const base = dirname(rootfile);
  const manifest = new Map<string, { href: string; type: string; props: string }>();
  for (const it of byLocal(opf, 'item')) manifest.set(it.getAttribute('id') ?? '', { href: it.getAttribute('href') ?? '', type: it.getAttribute('media-type') ?? '', props: it.getAttribute('properties') ?? '' });
  const spine = byLocal(opf, 'itemref').map((r) => manifest.get(r.getAttribute('idref') ?? '')?.href).filter((h): h is string => !!h).map((h) => resolvePath(base, h));
  if (!spine.length) throw new ImportError('corrupt', 'El EPUB está dañado: no tiene capítulos.');
  if (!zip.file(spine[0]!) && !spine.some((p) => zip.file(p))) throw new ImportError('corrupt', 'El EPUB está dañado: faltan los archivos de los capítulos.');

  const dc = (n: string) => clean(byLocal(opf, n)[0]?.textContent);
  const creators = byLocal(opf, 'creator').map((c) => clean(c.textContent)).filter(Boolean);
  const metas = byLocal(opf, 'meta');
  const coverId = metas.find((m) => m.getAttribute('name') === 'cover')?.getAttribute('content');
  const coverItem = [...manifest.values()].find((m) => m.props.split(/\s+/).includes('cover-image')) ?? (coverId ? manifest.get(coverId) : undefined);
  let cover: Blob | undefined;
  const coverFile = coverItem && coverItem.type.startsWith('image/') ? zip.file(resolvePath(base, coverItem.href)) : null;
  if (coverFile && coverItem) cover = new Blob([(await coverFile.async('uint8array')) as BlobPart], { type: coverItem.type });
  return { opfPath: rootfile, spine, title: dc('title') ?? '', author: creators.join(', ') || undefined, language: dc('language'), description: clean(dc('description')?.replace(/<[^>]+>/g, ' ')), cover };
}

export async function epubMetadata(data: Uint8Array | ArrayBuffer, fileName: string): Promise<BookMeta> {
  const JSZip = (await import('jszip')).default;
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new ImportError('corrupt', 'El archivo EPUB está dañado y no se puede leer.');
  }
  const info = await readEpub(zip);
  return { ...info, title: info.title || baseName(fileName) };
}

const firstHeading = (md: string) => /^\s{0,3}#{1,3}\s+(.+?)\s*#*\s*$/m.exec(md)?.[1]?.replace(/[*_`]/g, '').trim();

/** Metadatos de TXT/Markdown: título del primer encabezado (o primera línea corta) o nombre del archivo. */
export function textMetadata(text: string, fileName: string, format: BookFormat): BookMeta {
  const heading = firstHeading(text);
  let title = heading;
  if (!title && format === 'txt') {
    const line = text.split('\n').find((l) => l.trim());
    if (line && line.trim().length <= 80 && /\S/.test(line) && text.split('\n').length > 3) title = line.trim();
  }
  const author = /^\s*(?:autor|author)\s*[:：]\s*(.+)$/im.exec(text.slice(0, 2000))?.[1]?.trim();
  return { title: title || baseName(fileName), author };
}

export function htmlMetadata(html: string, fileName: string): BookMeta {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = (n: string) => clean(doc.querySelector(`meta[name="${n}" i]`)?.getAttribute('content'));
  return { title: clean(doc.title) || clean(doc.querySelector('h1')?.textContent) || baseName(fileName), author: meta('author'), language: clean(doc.documentElement.getAttribute('lang')) ?? meta('language'), description: meta('description') };
}

export function fb2Metadata(text: string, fileName: string): BookMeta {
  const doc = xml(text);
  if (doc.getElementsByTagName('parsererror').length) throw new ImportError('corrupt', 'El archivo FB2 está dañado (XML no válido).');
  const info = byLocal(doc, 'title-info')[0];
  if (!info) throw new ImportError('corrupt', 'El archivo FB2 no tiene la sección title-info.');
  const g = (n: string) => clean(byLocal(info, n)[0]?.textContent);
  const author = byLocal(info, 'author')[0];
  const name = author ? [clean(byLocal(author, 'first-name')[0]?.textContent), clean(byLocal(author, 'last-name')[0]?.textContent)].filter(Boolean).join(' ') : '';
  let cover: Blob | undefined;
  const href = byLocal(info, 'coverpage')[0] && byLocal(byLocal(info, 'coverpage')[0]!, 'image')[0];
  const ref = href && (href.getAttribute('l:href') ?? href.getAttribute('xlink:href') ?? href.getAttributeNS('http://www.w3.org/1999/xlink', 'href'));
  if (ref) {
    const bin = byLocal(doc, 'binary').find((b) => b.getAttribute('id') === ref.replace(/^#/, ''));
    if (bin?.textContent) {
      try {
        const raw = atob(bin.textContent.replace(/\s+/g, ''));
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        cover = new Blob([bytes as BlobPart], { type: bin.getAttribute('content-type') ?? 'image/jpeg' });
      } catch {
        /* sin portada */
      }
    }
  }
  return { title: g('book-title') ?? baseName(fileName), author: name || undefined, language: g('lang'), description: g('annotation'), cover };
}

/** Valida y extrae metadatos de formatos de texto. Devuelve también el texto Markdown si es válido. */
export function readTextual(bytes: Uint8Array, fileName: string, format: 'txt' | 'md' | 'html' | 'fb2'): { meta: BookMeta; md: string } {
  const head = decodeText(bytes.subarray(0, 300));
  const raw = decodeText(bytes, /encoding=["']([\w-]+)["']/i.exec(head)?.[1]);
  if (garbageRatio(raw) > 0.05) throw new ImportError('corrupt', 'No se puede leer el archivo como texto (la codificación no es válida).');
  let md: string;
  try {
    md = toMarkdown(raw, format);
  } catch {
    throw new ImportError('corrupt', 'El archivo está dañado y no se puede leer.');
  }
  if (!md.trim()) throw new ImportError('empty', 'El archivo no contiene texto.');
  const meta = format === 'fb2' ? fb2Metadata(raw, fileName) : format === 'html' ? htmlMetadata(raw, fileName) : textMetadata(md, fileName, format);
  return { meta, md };
}
export { fb2ToMarkdown };
