import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { PairMaps, parseTvtms, ParseStats, Target, TRADITIONS, Tradition } from './tvtms';

export const TVTMS_FILE = resolve(__dirname, '..', '..', 'raw', 'tvtms', 'tvtms.txt');
export const DATA_FILE = resolve(__dirname, '..', '..', '..', '..', 'packages', 'shared', 'src', 'versification', 'data.ts');
export const TVTMS_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Versification/TVTMS%20-%20Translators%20Versification%20Traditions%20with%20Methodology%20for%20Standardisation%20for%20Eng%2BHeb%2BLat%2BGrk%2BOthers%20-%20STEPBible.org%20CC%20BY.txt';

/**
 * Tramo: [capítulo, vDesde, vHasta, capítuloDestino, vDesdeDestino]; capítuloDestino 0 = no existe.
 * Los versículos no listados se convierten en identidad.
 */
export type Run = [number, number, number, number, number];
export type VersificationData = Record<string, Record<string, Run[]>>;

/**
 * Ester: TVTMS describe las adiciones griegas con pseudo-capítulos (A–F) que no coinciden con la
 * numeración de la Vulgata (Est 10,4–16,24). Se codifican aquí a mano: en la tradición `vulgate`
 * los versículos 10,4-13 y los capítulos 11-16 (adiciones deuterocanónicas) no existen en
 * english/hebrew. La tradición `greek` se trata como identidad con english (aproximación).
 */
const ESTHER_ADDITIONS: Run[] = [
  [10, 4, 13, 0, 0], [11, 1, 12, 0, 0], [12, 1, 6, 0, 0], [13, 1, 18, 0, 0], [14, 1, 19, 0, 0], [15, 1, 19, 0, 0], [16, 1, 24, 0, 0],
];

export function compress(maps: PairMaps): VersificationData {
  const out: VersificationData = {};
  for (const a of TRADITIONS)
    for (const b of TRADITIONS) {
      if (a === b) continue;
      const m = maps.get(`${a}>${b}`);
      const byBook = new Map<string, Array<{ c: number; v: number; t: Target }>>();
      for (const [k, t] of m ?? []) {
        const [book, c, v] = k.split('|') as [string, string, string];
        if (t && t.c === Number(c) && t.v === Number(v)) continue; // identidad
        (byBook.get(book) ?? byBook.set(book, []).get(book)!).push({ c: Number(c), v: Number(v), t });
      }
      const books: Record<string, Run[]> = {};
      for (const book of [...byBook.keys()].sort()) {
        const es = byBook.get(book)!.sort((x, y) => x.c - y.c || x.v - y.v);
        const runs: Run[] = [];
        for (const e of es) {
          const last = runs[runs.length - 1];
          const n = e.t ? e.t : { c: 0, v: 0 };
          if (last && last[0] === e.c && last[2] + 1 === e.v && last[3] === n.c && (n.c === 0 || last[4] + (last[2] - last[1] + 1) === n.v)) last[2] = e.v;
          else runs.push([e.c, e.v, e.v, n.c, n.v]);
        }
        books[book] = runs;
      }
      if (b === 'english' || b === 'hebrew') {
        if (a === 'vulgate') {
          books.Esth = ESTHER_ADDITIONS.map((r) => [...r] as Run);
          // Cántico de los tres jóvenes (Dn 3,24-90 Vulgata): TVTMS deja comentadas las filas de 3,52-90.
          books.Dan = [...(books.Dan ?? []).filter((r) => !(r[0] === 3 && r[2] <= 90 && r[3] === 0)), [3, 24, 90, 0, 0] as Run].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
        }
      }
      if (Object.keys(books).length) out[`${a}>${b}`] = books;
    }
  return out;
}

export function render(data: VersificationData, sourceSha256: string): string {
  const lines: string[] = [];
  lines.push('// ARCHIVO GENERADO por `pnpm --filter @bc/ingest versification` (tools/ingest/src/versification). No editar a mano.');
  lines.push("// Fuente: STEPBible TVTMS, https://github.com/STEPBible/STEPBible-Data (CC BY 4.0, Tyndale House Cambridge / STEPBible.org).");
  lines.push(`// sha256 del archivo TVTMS usado: ${sourceSha256}`);
  lines.push('// Tramo = [capítulo, vDesde, vHasta, capítuloDestino, vDesdeDestino]; capítuloDestino 0 = no existe en el destino.');
  lines.push('// Clave "origen>destino"; lo no listado es identidad. Tradiciones: english, hebrew, vulgate, greek.');
  lines.push('export const VERSIFICATION_DATA: Record<string, Record<string, ReadonlyArray<readonly [number, number, number, number, number]>>> = {');
  for (const pair of Object.keys(data).sort()) {
    lines.push(`  '${pair}': {`);
    for (const book of Object.keys(data[pair]!).sort()) lines.push(`    '${book}': ${JSON.stringify(data[pair]![book])},`);
    lines.push('  },');
  }
  lines.push('};', '');
  return lines.join('\n');
}

export interface BuildResult { stats: ParseStats; data: VersificationData; bytes: number; sha256: string; entries: number }

export function buildVersification(opts: { tvtmsFile?: string; out?: string; write?: boolean } = {}): BuildResult {
  const file = opts.tvtmsFile ?? TVTMS_FILE;
  if (!existsSync(file)) throw new Error(`Falta ${file}. Descarga el archivo TVTMS desde ${TVTMS_URL}`);
  const buf = readFileSync(file);
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const { maps, stats } = parseTvtms(buf.toString('utf8'));
  const data = compress(maps);
  const text = render(data, sha256);
  if (opts.write !== false) writeFileSync(opts.out ?? DATA_FILE, text);
  const entries = Object.values(data).reduce((s, b) => s + Object.values(b).reduce((t, r) => t + r.length, 0), 0);
  return { stats, data, bytes: Buffer.byteLength(text), sha256, entries };
}
