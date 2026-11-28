/**
 * Catálogo del santoral en memoria: une los paquetes `saints` instalados (el oficial `saints.es`
 * viene incluido en la app; un paquete posterior con el mismo id de santo sustituye al anterior).
 */
import type { Saint, SaintCelebration, SaintRank, SaintsPack } from '@bc/shared';
import { getDb, type AppDb } from '../db';
import { gunzipToText, parsePack, sha256Hex } from '../packs/pack';
import { entryFromPack, installPack } from '../packs/install';

export const BUNDLED_SAINTS_URL = '/packs/saints.es.pack';
export const BUNDLED_SAINTS_ID = 'saints.es';

export interface SaintCatalog {
  packs: { id: string; title: string; version: string }[];
  saints: Saint[];
  byId: Map<string, Saint>;
  /** "MM-DD" → santos con alguna celebración fija ese día */
  byDate: Map<string, Saint[]>;
  empty: boolean;
}

export function buildSaintCatalog(packs: SaintsPack[]): SaintCatalog {
  const byId = new Map<string, Saint>();
  for (const p of packs) for (const s of p.saints) byId.set(s.id, s);
  const saints = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const byDate = new Map<string, Saint[]>();
  for (const s of saints) {
    for (const md of new Set(s.celebrations.map((c) => c.date))) {
      const l = byDate.get(md) ?? [];
      l.push(s);
      byDate.set(md, l);
    }
  }
  return { packs: packs.map((p) => ({ id: p.id, title: p.meta.title, version: p.version })), saints, byId, byDate, empty: saints.length === 0 };
}

export async function loadSaintCatalog(db: AppDb = getDb()): Promise<SaintCatalog> {
  const installed = await db.installedPacks.where('kind').equals('saints').toArray();
  installed.sort((a, b) => a.installedAt.localeCompare(b.installedAt));
  const rows = await db.saintPacks.bulkGet(installed.map((i) => i.id));
  return buildSaintCatalog(rows.filter((r): r is NonNullable<typeof r> => !!r).map((r) => r.pack));
}

/** Instala o actualiza el santoral incluido (sin red externa). Devuelve true si escribió. */
export async function ensureBundledSaints(db: AppDb = getDb(), fetcher: typeof fetch = fetch): Promise<boolean> {
  let res: Response;
  try {
    res = await fetcher(BUNDLED_SAINTS_URL, { cache: 'no-cache' });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const data = await res.arrayBuffer();
  const pack = parsePack(await gunzipToText(data));
  if (pack.kind !== 'saints') return false;
  const cur = await db.installedPacks.get(pack.id);
  if (cur && cur.version.localeCompare(pack.version, 'en', { numeric: true }) >= 0) return false;
  const entry = { ...entryFromPack(pack, data.byteLength, await sha256Hex(data)), collection: 'Santoral' };
  await installPack(db, pack, entry, { catalogUrl: null });
  return true;
}

/** Instala si falta y carga. */
export async function loadSaintCatalogEnsured(db: AppDb = getDb(), fetcher: typeof fetch = fetch): Promise<SaintCatalog> {
  await ensureBundledSaints(db, fetcher).catch(() => false);
  return loadSaintCatalog(db);
}

// ── Rangos y calendarios ───────────────────────────────────────────────────

export const RANK_LABEL: Record<SaintRank, string> = {
  solemnity: 'Solemnidad',
  feast: 'Fiesta',
  memorial: 'Memoria obligatoria',
  optional: 'Memoria libre',
  commemoration: 'Conmemoración',
  none: 'Sin celebración litúrgica',
};
/** Rango de la Tabla de precedencia (1-12) de una celebración de santo; 13 = sin celebración. */
export function rankNumber(rank: SaintRank, calendar: string): number {
  switch (rank) {
    case 'solemnity': return 3;
    case 'feast': return calendar === 'general' ? 7 : 8;
    case 'memorial': return 10;
    case 'optional': return 11;
    case 'commemoration': return 12;
    default: return 13;
  }
}

/** Celebración aplicable a un santo en un día y calendario: la del propio vence a la del general. */
export function celebrationFor(s: Saint, md: string, calendar: string): SaintCelebration | null {
  const on = s.celebrations.filter((c) => c.date === md);
  return on.find((c) => c.calendar === calendar && calendar !== 'general') ?? on.find((c) => c.calendar === 'general') ?? null;
}

/** Primera celebración de un santo en el calendario elegido (para fichas). */
export function celebrationsInCalendar(s: Saint, calendar: string): SaintCelebration[] {
  const own = calendar !== 'general' ? s.celebrations.filter((c) => c.calendar === calendar) : [];
  const gen = s.celebrations.filter((c) => c.calendar === 'general' && !own.some((o) => o.date === c.date));
  return [...own, ...gen];
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "12-09" → "9 de diciembre" */
export function formatMonthDay(md: string): string {
  const [m, d] = md.split('-').map(Number) as [number, number];
  return `${d} de ${MONTHS[m - 1]}`;
}
