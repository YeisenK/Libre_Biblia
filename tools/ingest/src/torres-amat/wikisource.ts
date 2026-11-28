/**
 * Descarga de las páginas de escaneo (espacio «Página:») de los índices de «La Sagrada Biblia» (Torres Amat)
 * en es.wikisource.org, con su nivel de calidad ProofreadPage (`<pagequality level="N" />`).
 * Niveles: 0 sin texto, 1 sin corregir, 2 problemática, 3 corregida, 4 validada.
 * Reutiliza el cliente con 1 petición cada 1,5 s y caché en raw/culture/torres-amat/.
 */
import { Wiki } from '../culture/wiki';

export const TA_SLUG = 'torres-amat';

export interface TaPage {
  index: string; // «Índice:La Sagrada Biblia (XIII).djvu»
  offset: number; // nº de página del escaneo
  title: string; // «Página:La Sagrada Biblia (XIII).djvu/20»
  level: number; // 0-4; -1 si la página no existe / sin contenido
  user?: string;
  revid?: number;
  wikitext: string;
}

export async function listIndexes(w: Wiki = new Wiki('es')): Promise<string[]> {
  const d = await w.api(TA_SLUG, { action: 'query', list: 'allpages', apnamespace: '104', apprefix: 'La Sagrada Biblia', aplimit: '500' });
  return d.query.allpages.map((p: { title: string }) => p.title as string).sort();
}

/** Títulos de las páginas del escaneo en orden, con su offset. */
export async function listIndexPages(index: string, w: Wiki = new Wiki('es')): Promise<{ offset: number; title: string }[]> {
  const d = await w.api(TA_SLUG, { action: 'query', list: 'proofreadpagesinindex', prppiititle: index, prppiiprop: 'ids|title' });
  if (d.continue) throw new Error(`Respuesta paginada no soportada para ${index}`);
  return (d.query.proofreadpagesinindex as { pageoffset: number; title: string }[]).map((p) => ({ offset: p.pageoffset, title: p.title }));
}

export function parseQuality(wikitext: string): { level: number; user?: string } {
  const m = /<pagequality\s+level="(\d)"(?:\s+user="([^"]*)")?/.exec(wikitext);
  return m ? { level: Number(m[1]), user: m[2] } : { level: -1 };
}

export async function fetchIndex(index: string, w: Wiki = new Wiki('es')): Promise<TaPage[]> {
  const pages = await listIndexPages(index, w);
  const got = await w.getPages(TA_SLUG, pages.map((p) => p.title));
  return pages.map((p) => {
    const g = got.get(p.title);
    const wikitext = g?.content ?? '';
    return { index, offset: p.offset, title: p.title, ...parseQuality(wikitext), revid: g?.revid, wikitext };
  });
}
