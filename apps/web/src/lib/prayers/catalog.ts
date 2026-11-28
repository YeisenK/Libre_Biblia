/**
 * Catálogo de oraciones en memoria: une todos los paquetes `prayers` instalados.
 * Si dos paquetes traen el mismo id, gana el instalado después (permite que un
 * repositorio de terceros corrija o amplíe sin tocar el oficial).
 */
import type { Practice, Mystery, MysterySet, Novena, Prayer, PrayerCategory, PrayersPack, RosaryData, RoutineTemplate } from '@bc/shared';
import { getDb, type AppDb } from '../db';
import { gunzipToText, parsePack, sha256Hex } from '../packs/pack';
import { entryFromPack, installPack } from '../packs/install';

export interface PrayerCatalog {
  packs: { id: string; title: string; version: string }[];
  categories: PrayerCategory[];
  prayers: Prayer[];
  prayerById: Map<string, Prayer>;
  novenas: Novena[];
  novenaById: Map<string, Novena>;
  rosary: RosaryData | null;
  routines: RoutineTemplate[];
  practices: Practice[];
  practiceById: Map<string, Practice>;
  empty: boolean;
}

export function buildCatalog(packs: PrayersPack[]): PrayerCatalog {
  const cats = new Map<string, PrayerCategory>();
  const prayers = new Map<string, Prayer>();
  const novenas = new Map<string, Novena>();
  const routines = new Map<string, RoutineTemplate>();
  const practices = new Map<string, Practice>();
  let rosary: RosaryData | null = null;
  for (const p of packs) {
    for (const c of p.categories) cats.set(c.id, c);
    for (const x of p.prayers) prayers.set(x.id, x);
    for (const n of p.novenas) novenas.set(n.id, n);
    for (const r of p.routines ?? []) routines.set(r.id, r);
    for (const x of p.practices ?? []) practices.set(x.id, x);
    if (p.rosary) rosary = p.rosary;
  }
  const categories = [...cats.values()].sort((a, b) => a.order - b.order);
  return {
    packs: packs.map((p) => ({ id: p.id, title: p.meta.title, version: p.version })),
    categories,
    prayers: [...prayers.values()],
    prayerById: prayers,
    novenas: [...novenas.values()],
    novenaById: novenas,
    rosary,
    routines: [...routines.values()],
    practices: [...practices.values()],
    practiceById: practices,
    empty: prayers.size === 0,
  };
}

export async function loadCatalog(db: AppDb = getDb()): Promise<PrayerCatalog> {
  const installed = await db.installedPacks.where('kind').equals('prayers').toArray();
  installed.sort((a, b) => a.installedAt.localeCompare(b.installedAt));
  const rows = await db.prayerPacks.bulkGet(installed.map((i) => i.id));
  return buildCatalog(rows.filter((r): r is NonNullable<typeof r> => !!r).map((r) => r.pack));
}

export function mysteriesOf(rosary: RosaryData, set: MysterySet): Mystery[] {
  return rosary.mysteries.filter((m) => m.set === set).sort((a, b) => a.n - b.n);
}

/** Texto de una oración con la variante elegida por el usuario. */
export function prayerText(p: Prayer, variants: Record<string, string> = {}): string {
  const v = variants[p.id];
  return (v && p.variants?.find((x) => x.id === v)?.text) || p.text;
}

/** Clave de elemento de rutina → título legible. */
export function itemTitle(cat: PrayerCatalog, key: string): string {
  if (key === 'rosary') return 'Santo Rosario';
  if (key === 'gospel') return 'Evangelio del día';
  if (key === 'verse') return 'Versículo del día';
  const [kind, id] = key.split(':') as [string, string];
  if (kind === 'prayer') return cat.prayerById.get(id)?.title ?? id;
  if (kind === 'novena') return cat.novenaById.get(id)?.title ?? id;
  return key;
}

/** Ruta de la app para abrir un elemento de rutina o favorito. */
export function itemHref(key: string): string {
  if (key === 'rosary') return '/rosario/';
  if (key === 'gospel' || key === 'verse') return '/hoy/';
  const [kind, id] = key.split(':') as [string, string];
  if (kind === 'prayer') return `/oracion/?id=${encodeURIComponent(id)}`;
  if (kind === 'novena') return `/novena/?id=${encodeURIComponent(id)}`;
  return '/orar/';
}

// ── Devocionario incluido en la app ────────────────────────────────────────

/** Paquete de oraciones oficial incluido en la app (contenido propio del proyecto, CC BY-SA 4.0). */
/** Extensión `.pack` (gzip): Android descomprime y renombra los `.gz` de los assets. */
export const BUNDLED_PRAYERS_URL = '/packs/prayers.es.pack';
export const BUNDLED_PRAYERS_ID = 'prayers.es';

/**
 * Instala o actualiza el devocionario incluido, sin red externa. Se llama al abrir la app;
 * solo escribe si no está instalado o si la versión incluida es más nueva.
 */
export async function ensureBundledPrayers(db: AppDb = getDb(), fetcher: typeof fetch = fetch): Promise<boolean> {
  let res: Response;
  try {
    res = await fetcher(BUNDLED_PRAYERS_URL, { cache: 'no-cache' });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const data = await res.arrayBuffer();
  const pack = parsePack(await gunzipToText(data));
  if (pack.kind !== 'prayers') return false;
  const cur = await db.installedPacks.get(pack.id);
  if (cur && cur.version >= pack.version) return false;
  const entry = { ...entryFromPack(pack, data.byteLength, await sha256Hex(data)), collection: 'Oraciones' };
  await installPack(db, pack, entry, { catalogUrl: null });
  return true;
}

/**
 * Separa una lectura compuesta de varios libros («Is 6,1-4; Ap 5,11-14») en referencias
 * de un solo libro que entiende el analizador de citas. Los tramos sin libro
 * («Ap 1,4-8; 22,12-13») se quedan con el anterior.
 */
export function splitReadings(ref: string): string[] {
  const out: string[] = [];
  for (const raw of ref.replace(/[–—]/g, '-').split(';')) {
    const part = raw.trim();
    if (!part) continue;
    const startsWithBook = /^(?:[1-4]\s*)?[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(part);
    if (startsWithBook || !out.length) out.push(part);
    else out[out.length - 1] += `; ${part}`;
  }
  return out;
}
