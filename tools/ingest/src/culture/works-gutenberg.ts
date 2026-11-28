/**
 * Obras de Project Gutenberg (espejo de ibiblio). Verificación de dominio público (ver docs/SOURCES_AND_LICENSES.md).
 */
import type { Sec } from './build';
import { reflowParagraphs, splitByLabel, type GutenbergSpec } from './gutenberg';

const C_APOLOGETICA = 'Apologética y pensamiento católico';
const ORD: Record<string, string> = { PRIMERO: 'I', PRIMERA: 'I' };

/** Quita la sangría común de un bloque (las notas de Balmes van sangradas 7 espacios). */
export function dedent(block: string): string {
  const lines = block.split('\n');
  const min = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length));
  return Number.isFinite(min) && min > 0 ? lines.map((l) => l.slice(Math.min(min, /^ */.exec(l)![0].length))).join('\n') : block;
}

/** «CAPITULO II» / «CAPÍTULO PRIMERO.» → «Capítulo II» */
export function chapterTitle(label: string): string {
  const raw = label.replace(/^CAP[ÍI]TULO\s+/i, '').replace(/[.\s]+$/, '').toLocaleUpperCase('es');
  return `Capítulo ${ORD[raw] ?? raw}`;
}

/**
 * Balmes, *El Protestantismo comparado con el Catolicismo* (10.ª ed., 1921), tomos I y II.
 * Cada tomo: capítulos «CAPITULO N», «NOTAS» al final del tomo y un índice que se descarta.
 */
export function segmentProtestantismo(body: string): Sec[] {
  const lines = body.split('\n');
  const idx = (re: RegExp, from = 0) => { for (let i = from; i < lines.length; i++) if (re.test(lines[i]!)) return i; return -1; };
  const prologo = idx(/^PRÓLOGO$/);
  const notas1 = idx(/^NOTAS$/, prologo);
  const fin1 = idx(/^\s+FIN DE LAS NOTAS\s*$/, notas1);
  const tomo2 = idx(/^\s+TOMO SEGUNDO\s*$/, fin1);
  const notas2 = idx(/^NOTAS$/, tomo2);
  const fin2 = idx(/^\s+FIN DE LAS NOTAS\s*$/, notas2);
  if ([prologo, notas1, fin1, tomo2, notas2, fin2].some((i) => i < 0)) throw new Error('estructura inesperada en Balmes #59797');
  const slice = (a: number, b: number) => lines.slice(a, b).join('\n');
  const out: Sec[] = [];
  const tomo = (title: string, textStart: number, notesStart: number, finNotes: number, withPrologue: boolean) => {
    out.push({ title, depth: 0, text: '' });
    const { lead, parts } = splitByLabel(slice(textStart, notesStart), /^CAPITULO (?:[IVXLC]+|PRIMERO)$/);
    if (withPrologue) out.push({ title: 'Prólogo', depth: 1, text: reflowParagraphs(lead.replace(/^PRÓLOGO\n/, '').trim()) });
    for (const p of parts) out.push({ title: chapterTitle(p.label), depth: 1, text: reflowParagraphs(p.body.trim()) });
    out.push({ title: 'Notas', depth: 1, text: reflowParagraphs(dedent(slice(notesStart + 1, finNotes).trim()), false) });
  };
  tomo('Tomo primero', prologo, notas1, fin1, true);
  tomo('Tomo segundo', tomo2, notas2, fin2, false);
  return out;
}

/** Convierte «§ I.\n\nTítulo.» en un único párrafo-encabezado «§ I. Título.» */
export function mergeSubheads(text: string): string {
  return text.replace(/^(§ [IVXLC]+\.)\n\n([^\n]+)$/gm, '$1 $2');
}

/** Balmes, *El Criterio* (Paris, Bouret y Morel, 1849): 22 capítulos con título en mayúsculas y apartados «§», más las notas finales. */
export function segmentCriterio(body: string): Sec[] {
  const lines = body.split('\n');
  const fin = lines.findIndex((l) => /^FIN\.$/.test(l));
  const notas = lines.findIndex((l, i) => i > fin && /^NOTAS$/.test(l));
  const finNotas = lines.findIndex((l, i) => i > notas && /^FIN DE LAS NOTAS\.$/.test(l));
  if (fin < 0 || notas < 0 || finNotas < 0) throw new Error('estructura inesperada en Balmes #28929');
  const { parts } = splitByLabel(lines.slice(0, fin).join('\n'), /^CAPÍTULO [A-ZÁÉÍÓÚ]+\.$/);
  const out: Sec[] = [];
  for (const p of parts) {
    const b = p.body.replace(/^\n+/, '');
    const m = /^([^\n]+(?:\n[^\n]+)*)\n\n/.exec(b);
    const sub = m ? m[1]!.replace(/\n/g, ' ').replace(/\.$/, '') : '';
    const cap = chapterTitle(p.label);
    const nice = sub ? sub.charAt(0) + sub.slice(1).toLocaleLowerCase('es') : '';
    out.push({ title: nice ? `${cap}. ${nice}` : cap, depth: 0, text: reflowParagraphs(mergeSubheads(b.slice(m ? m[0].length : 0)).trim()) });
  }
  out.push({ title: 'Notas', depth: 0, text: reflowParagraphs(lines.slice(notas + 1, finNotas).join('\n').trim(), false) });
  return out;
}

export const WORKS_GUTENBERG: GutenbergSpec[] = [
  {
    slug: 'protestantismo-catolicismo-balmes', title: 'El Protestantismo comparado con el Catolicismo en sus relaciones con la civilización europea',
    subtitle: 'Jaime Balmes, tomos I y II (37 capítulos y notas)', genre: 'treatise', language: 'es',
    author: { name: 'Jaime Balmes', born: '1810', died: '1848' }, region: 'España', country: 'España', period: '1842–1844',
    collection: C_APOLOGETICA, authority: 'theological_opinion',
    edition: 'Décima edición, Barcelona, Imprenta del «Diario de Barcelona», 1921, tomos primero y segundo (escaneo de Internet Archive/Canadian Libraries; ortografía de la edición)',
    ebook: 59797, file: '5/9/7/9/59797/59797-8.txt', encoding: 'latin1', segment: segmentProtestantismo,
    extraNotes: 'Balmes † 1848 (autor y obra en español: sin traductor). Cada tomo termina con sus «Notas», que se conservan; se omiten los índices de capítulos y de notas.',
  },
  {
    slug: 'el-criterio-balmes', title: 'El Criterio', subtitle: 'Jaime Balmes, 22 capítulos y notas', genre: 'essay', language: 'es',
    author: { name: 'Jaime Balmes', born: '1810', died: '1848' }, region: 'España', country: 'España', period: '1845',
    collection: C_APOLOGETICA, authority: 'literary',
    edition: 'Nueva edición, París, Librería de A. Bouret y Morel, 1849 (escaneo de la BnF/Gallica; ortografía de la edición)',
    ebook: 28929, file: '2/8/9/2/28929/28929-8.txt', encoding: 'latin1', segment: segmentCriterio,
    extraNotes: 'Balmes † 1848 (sin traductor). Se conservan los apartados «§» y las notas finales; se omite el índice de materias. Ensayo de lógica práctica de un presbítero; no es texto del magisterio.',
  },
];
