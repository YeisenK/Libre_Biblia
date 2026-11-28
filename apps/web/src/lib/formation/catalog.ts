/**
 * Catálogo de Formación en memoria (paquete `formation.es`, incluido en la app).
 * Solo índices, resúmenes propios y enlaces a vatican.va; nunca el texto íntegro del Catecismo.
 */
import type { CccNode, ChurchDoc, CompendioNode, DictCategory, DictEntry, FormationPack, LatinExercise } from '@bc/shared';
import { getDb, type AppDb } from '../db';
import { gunzipToText, parsePack, sha256Hex } from '../packs/pack';
import { entryFromPack, installPack } from '../packs/install';

export const BUNDLED_FORMATION_URL = '/packs/formation.es.pack';
export const FORMATION_ID = 'formation.es';

export interface CccHit {
  /** Nodos desde la parte hasta el tramo más específico que contiene el número */
  path: CccNode[];
  node: CccNode;
  url: string;
}

export function flatten(nodes: CccNode[]): CccNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
}

/** URL de vatican.va del tramo (o de su primer descendiente con archivo). */
export function cccUrl(pack: FormationPack, node: CccNode, n?: number): string {
  const file = node.file ?? flatten(node.children ?? []).find((c) => c.file)?.file;
  const base = pack.ccc.baseUrl + (file ?? 'index_sp.html');
  void n;
  return base;
}

/** `ccc:1324` o `1324` → tramo más específico y su ruta. */
export function findCcc(pack: FormationPack, n: number): CccHit | null {
  if (!Number.isInteger(n) || n < 1 || n > 2865) return null;
  let best: CccHit | null = null;
  const walk = (nodes: CccNode[], path: CccNode[]) => {
    for (const node of nodes) {
      const p = [...path, node];
      if (node.from !== undefined && node.from !== 0 && n >= node.from && node.to! >= n) best = { path: p, node, url: cccUrl(pack, node, n) };
      if (node.children) walk(node.children, p);
    }
  };
  walk(pack.ccc.nodes, []);
  return best;
}

export function parseCccQuery(q: string): number | null {
  const m = /^\s*(?:ccc:)?(\d{1,4})\s*$/i.exec(q);
  return m ? Number(m[1]) : null;
}

/** Preguntas del Compendio que remiten al número del Catecismo. */
export function compendioFor(pack: FormationPack, n: number): number[] {
  return pack.compendio.questions.filter((q) => q.ccc.some(([a, b]) => n >= a && n <= b)).map((q) => q.n);
}

export function searchCcc(pack: FormationPack, q: string, limit = 40): CccNode[] {
  const t = q.trim().toLowerCase();
  if (t.length < 3) return [];
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nt = norm(t);
  return flatten(pack.ccc.nodes).filter((n) => norm(`${n.title} ${n.summary ?? ''}`).includes(nt)).slice(0, limit);
}

export function searchDocs(docs: ChurchDoc[], q: string): ChurchDoc[] {
  const nt = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!nt) return docs;
  return docs.filter((d) => `${d.titleLa} ${d.titleEs} ${d.author} ${d.themes.join(' ')}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(nt));
}

export const DOC_CATEGORY_LABEL: Record<ChurchDoc['category'], string> = {
  'vaticano-ii': 'Concilio Vaticano II',
  enciclica: 'Encíclica',
  exhortacion: 'Exhortación apostólica',
  'carta-apostolica': 'Carta apostólica',
  'constitucion-apostolica': 'Constitución apostólica',
  'motu-proprio': 'Motu proprio',
  dicasterio: 'Dicasterio',
  cem: 'Conferencia Episcopal Mexicana',
  celam: 'CELAM',
};

export function compendioRange(n: CompendioNode) {
  return n.from === n.to ? `pregunta ${n.from}` : `preguntas ${n.from}-${n.to}`;
}

export async function loadFormation(db: AppDb = getDb()): Promise<FormationPack | null> {
  const row = await db.prayerPacks.get(FORMATION_ID);
  const p = row?.pack as unknown as FormationPack | undefined;
  return p && p.kind === 'formation' ? p : null;
}

/** Instala o actualiza el paquete incluido (sin red externa). */
export async function ensureBundledFormation(db: AppDb = getDb(), fetcher: typeof fetch = fetch): Promise<boolean> {
  let res: Response;
  try {
    res = await fetcher(BUNDLED_FORMATION_URL, { cache: 'no-cache' });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const data = await res.arrayBuffer();
  const pack = parsePack(await gunzipToText(data));
  if (pack.kind !== 'formation') return false;
  const cur = await db.installedPacks.get(pack.id);
  if (cur && cur.version.localeCompare(pack.version, 'en', { numeric: true }) >= 0) return false;
  const entry = { ...entryFromPack(pack, data.byteLength, await sha256Hex(data)), collection: 'Formación' };
  await installPack(db, pack, entry, { catalogUrl: null });
  return true;
}

export async function loadFormationEnsured(db: AppDb = getDb(), fetcher: typeof fetch = fetch): Promise<FormationPack | null> {
  await ensureBundledFormation(db, fetcher).catch(() => false);
  return loadFormation(db);
}

// ── Progreso, favoritos y notas (locales) ──────────────────────────────────

export const lessonLocator = (id: string) => `lesson:${id}`;

export async function readLessons(db: AppDb = getDb()): Promise<Set<string>> {
  const rows = await db.annotations.where('bookId').equals('formation').toArray();
  return new Set(rows.map((r) => r.locator.replace(/^lesson:/, '')));
}
export async function setLessonRead(id: string, read: boolean, db: AppDb = getDb()) {
  const key = `formation:${lessonLocator(id)}`;
  if (read) {
    const now = new Date().toISOString();
    await db.annotations.put({ id: key, bookId: 'formation', kind: 'bookmark', locator: lessonLocator(id), createdAt: now, updatedAt: now });
  } else await db.annotations.delete(key);
}
export async function toggleCccFavorite(n: number, title: string, db: AppDb = getDb()): Promise<boolean> {
  const key = `ccc:${n}`;
  if (await db.luxFavorites.get(key)) { await db.luxFavorites.delete(key); return false; }
  await db.luxFavorites.put({ key, title, savedAt: new Date().toISOString() });
  return true;
}
export async function getCccNote(n: number, db: AppDb = getDb()) {
  return db.annotations.get(`ccc:${n}`);
}
export async function saveCccNote(n: number, note: string, db: AppDb = getDb()) {
  const now = new Date().toISOString();
  if (!note.trim()) return db.annotations.delete(`ccc:${n}`);
  const cur = await db.annotations.get(`ccc:${n}`);
  await db.annotations.put({ id: `ccc:${n}`, bookId: 'ccc', kind: 'note', locator: `ccc:${n}`, note, createdAt: cur?.createdAt ?? now, updatedAt: now });
}

// ── Diccionario y latín ────────────────────────────────────────────────────

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const DICT_CATEGORY_LABEL: Record<DictCategory, string> = {
  teologia: 'Teología', liturgia: 'Liturgia', sacramentos: 'Sacramentos', filosofia: 'Filosofía', biblia: 'Biblia',
  patristica: 'Patrística', latin: 'Expresiones latinas', moral: 'Moral', iglesia: 'Iglesia', oracion: 'Oración',
};

/** Búsqueda sin tildes ni mayúsculas: primero el término, luego alias, luego la definición. */
export function searchDict(entries: DictEntry[], q: string, category: DictCategory | 'all' = 'all'): DictEntry[] {
  const nt = norm(q.trim());
  const pool = category === 'all' ? entries : entries.filter((e) => e.category === category);
  if (!nt) return [...pool].sort((a, b) => norm(a.term).localeCompare(norm(b.term), 'es'));
  const score = (e: DictEntry) => {
    const t = norm(e.term);
    if (t === nt) return 0;
    if (t.startsWith(nt)) return 1;
    if (t.includes(nt)) return 2;
    if (e.alt.some((a) => norm(a).includes(nt))) return 3;
    if (norm(`${e.definition} ${e.usage ?? ''} ${e.etymology ?? ''}`).includes(nt)) return 4;
    return 9;
  };
  return pool.map((e) => [score(e), e] as const).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || norm(a[1].term).localeCompare(norm(b[1].term), 'es')).map(([, e]) => e);
}

/** Comprobación local de un ejercicio de latín (sin puntuación ni rachas). */
export function checkLatinExercise(x: LatinExercise, answer: number | number[] | null): boolean {
  if (x.kind === 'match') return Array.isArray(answer) && answer.length === x.pairs.length && answer.every((v, i) => v === i);
  return typeof answer === 'number' && answer === x.answer;
}
