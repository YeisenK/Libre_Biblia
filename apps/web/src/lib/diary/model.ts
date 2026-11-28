/**
 * Diario espiritual: modelo puro (sin Dexie). Validación, agrupación por día,
 * búsqueda en texto, referencias y cuadrícula del calendario mensual.
 */
import type { DiaryEntryRow } from '../db';

export type DiaryKind = DiaryEntryRow['kind'];
export type IntentionStatus = NonNullable<DiaryEntryRow['status']>;

export const DIARY_KINDS: readonly DiaryKind[] = ['reflection', 'purpose', 'intention', 'gratitude', 'quote', 'reading', 'retreat', 'note'];

export const DIARY_KIND_LABEL: Record<DiaryKind, string> = {
  reflection: 'Reflexión',
  purpose: 'Propósito',
  intention: 'Intención de oración',
  gratitude: 'Gratitud',
  quote: 'Cita',
  reading: 'Lectura',
  retreat: 'Retiro',
  note: 'Nota',
};

export const INTENTION_STATUS_LABEL: Record<IntentionStatus, string> = { encomendada: 'Encomendada', atendida: 'Atendida' };

export const MAX_TITLE = 120;
export const MAX_TEXT = 20000;
export const MAX_REFS = 10;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDiaryDate = (s: unknown): s is string => {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};

export const isDiaryKind = (k: unknown): k is DiaryKind => typeof k === 'string' && (DIARY_KINDS as readonly string[]).includes(k);

/** Borrador de entrada (lo que escribe el usuario). */
export interface DiaryDraft {
  date: string;
  kind: DiaryKind;
  title?: string;
  text: string;
  refs?: string[];
  status?: IntentionStatus;
}

/** Normaliza y valida; devuelve el error en español o el borrador limpio. */
export function validateDraft(d: DiaryDraft): { ok: true; value: DiaryDraft } | { ok: false; error: string } {
  if (!isDiaryDate(d.date)) return { ok: false, error: 'La fecha no es válida.' };
  if (!isDiaryKind(d.kind)) return { ok: false, error: 'Elige el tipo de entrada.' };
  const text = (d.text ?? '').trim();
  if (!text) return { ok: false, error: 'Escribe el texto de la entrada.' };
  if (text.length > MAX_TEXT) return { ok: false, error: `El texto no puede superar ${MAX_TEXT} caracteres.` };
  const title = (d.title ?? '').trim();
  if (title.length > MAX_TITLE) return { ok: false, error: `El título no puede superar ${MAX_TITLE} caracteres.` };
  const refs = uniq((d.refs ?? []).map((r) => r.trim()).filter(Boolean));
  if (refs.length > MAX_REFS) return { ok: false, error: `Puedes añadir hasta ${MAX_REFS} referencias.` };
  for (const r of refs) if (!/^(bible|prayer|novena|saint):.+/.test(r)) return { ok: false, error: 'Referencia no válida.' };
  const status = d.kind === 'intention' && (d.status === 'encomendada' || d.status === 'atendida') ? d.status : undefined;
  return {
    ok: true,
    value: { date: d.date, kind: d.kind, text, ...(title ? { title } : {}), ...(refs.length ? { refs } : {}), ...(status ? { status } : {}) },
  };
}

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

/** Referencias: "bible:Jn 8,12", "prayer:padre-nuestro", "novena:san-jose", "saint:<id>". */
export function bibleRef(ref: string): string {
  return `bible:${ref.trim()}`;
}

export function parseRef(ref: string): { kind: 'bible' | 'prayer' | 'novena' | 'saint'; id: string } | null {
  const m = /^(bible|prayer|novena|saint):(.+)$/.exec(ref);
  return m ? { kind: m[1] as 'bible' | 'prayer' | 'novena' | 'saint', id: m[2]! } : null;
}

/** Texto legible de una referencia (sin consultar el catálogo; el llamador puede sustituir ids por títulos). */
export function refLabel(ref: string, titleOf?: (kind: string, id: string) => string | undefined): string {
  const p = parseRef(ref);
  if (!p) return ref;
  if (p.kind === 'bible') return p.id;
  return titleOf?.(p.kind, p.id) ?? p.id;
}

/** Quita acentos y pasa a minúsculas para comparar. */
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Búsqueda simple en título, texto y referencias: todas las palabras deben aparecer. */
export function matchesQuery(e: DiaryEntryRow, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = normalize([e.title ?? '', e.text, ...(e.refs ?? []).map((r) => r.replace(/^[a-z]+:/, ''))].join(' \n '));
  return words.every((w) => hay.includes(w));
}

export function filterEntries(entries: DiaryEntryRow[], opts: { kind?: DiaryKind | 'all'; query?: string; date?: string | null } = {}): DiaryEntryRow[] {
  return entries.filter((e) => (!opts.kind || opts.kind === 'all' || e.kind === opts.kind) && (!opts.date || e.date === opts.date) && (!opts.query || matchesQuery(e, opts.query)));
}

export interface DiaryDayGroup {
  date: string;
  entries: DiaryEntryRow[];
}

/** Agrupa por día, del más reciente al más antiguo; dentro del día, la última escrita primero. */
export function groupByDay(entries: DiaryEntryRow[]): DiaryDayGroup[] {
  const map = new Map<string, DiaryEntryRow[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, list]) => ({ date, entries: list.sort((x, y) => (x.createdAt < y.createdAt ? 1 : x.createdAt > y.createdAt ? -1 : 0)) }));
}

/** Conjunto de días (YYYY-MM-DD) con al menos una entrada. */
export function daysWithEntries(entries: Pick<DiaryEntryRow, 'date'>[]): Set<string> {
  return new Set(entries.map((e) => e.date));
}

export interface MonthCell {
  date: string | null;
  day: number | null;
}

/** Cuadrícula mensual de semanas que empiezan en lunes. `month` es 1-12. Celdas vacías son date:null. */
export function monthGrid(year: number, month: number): MonthCell[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: MonthCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= days; d++) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: ds, day: d });
  }
  while (cells.length % 7) cells.push({ date: null, day: null });
  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Mes «YYYY-MM» de una fecha ISO. */
export const monthOf = (date: string) => date.slice(0, 7);

/** Desplaza un mes «YYYY-MM» n meses. */
export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] as const;
