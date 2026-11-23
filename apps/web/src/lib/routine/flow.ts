/**
 * Lógica pura del modo de oración guiado de una rutina: tipo de cada paso, tiempo aproximado,
 * punto de reanudación y estado guardado (posición y vuelta desde el Rosario).
 */

export type StepKind = 'prayer' | 'novena' | 'gospel' | 'verse' | 'rosary' | 'unknown';

export interface ParsedItem {
  kind: StepKind;
  id: string;
}

/** `prayer:<id>`, `novena:<id>`, `gospel`, `verse`, `rosary` → tipo e id. */
export function parseItem(key: string): ParsedItem {
  if (key === 'gospel' || key === 'verse' || key === 'rosary') return { kind: key, id: '' };
  const at = key.indexOf(':');
  const kind = at < 0 ? '' : key.slice(0, at);
  const id = at < 0 ? '' : key.slice(at + 1);
  if ((kind === 'prayer' || kind === 'novena') && id) return { kind, id };
  return { kind: 'unknown', id: key };
}

/** Minutos aproximados por tipo de paso cuando el catálogo no los indica. */
export const MINUTES = { novena: 8, gospel: 3, verse: 1, rosary: 20, unknown: 1 } as const;
const WORDS_PER_MINUTE = 110;

export interface MinutesSource {
  prayerById: Map<string, { minutes?: number; text: string }>;
}

export function itemMinutes(key: string, cat: MinutesSource | null | undefined): number {
  const { kind, id } = parseItem(key);
  if (kind === 'prayer') {
    const p = cat?.prayerById.get(id);
    if (!p) return 1;
    if (p.minutes && p.minutes > 0) return p.minutes;
    const words = p.text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(0.5, words / WORDS_PER_MINUTE);
  }
  return MINUTES[kind];
}

/** Tiempo total aproximado en minutos enteros (mínimo 1). */
export function estimateMinutes(items: string[], cat: MinutesSource | null | undefined): number {
  const total = items.reduce((s, k) => s + itemMinutes(k, cat), 0);
  return Math.max(1, Math.round(total));
}

export const firstPending = (items: string[], done?: ReadonlySet<string>): number => items.findIndex((k) => !done?.has(k));

/** Siguiente elemento pendiente a partir de `from` (incluido); -1 si no queda ninguno. */
export function nextPendingFrom(items: string[], done: ReadonlySet<string> | undefined, from: number): number {
  for (let i = Math.max(0, from); i < items.length; i++) if (!done?.has(items[i]!)) return i;
  return -1;
}

/**
 * Dónde empezar: la posición guardada si ese elemento sigue pendiente; si no, el primer pendiente;
 * 0 si todo está hecho (volver a rezar desde el principio).
 */
export function resumeIndex(items: string[], done: ReadonlySet<string> | undefined, saved: number | null): number {
  if (saved !== null && saved >= 0 && saved < items.length && !done?.has(items[saved]!)) return saved;
  const p = firstPending(items, done);
  return p < 0 ? 0 : p;
}

/** Acota un índice de la URL: 0..n (n = pantalla final). Valores no válidos → null. */
export function parseIndex(raw: string | null | undefined, n: number): number | null {
  if (raw === null || raw === undefined || !/^\d{1,3}$/.test(raw)) return null;
  return Math.min(n, Number(raw));
}

/** «3 de 9 · Acto de contrición» */
export const stepLabel = (index: number, total: number, title: string): string => `${index + 1} de ${total} · ${title}`;

export const countDone = (items: string[], done?: ReadonlySet<string>): number => items.filter((k) => done?.has(k)).length;

/** Etiqueta del botón principal de la pantalla de inicio. */
export function startLabel(items: string[], done?: ReadonlySet<string>): string {
  const d = countDone(items, done);
  if (d === 0) return 'Comenzar';
  if (d >= items.length) return 'Rezar de nuevo';
  return 'Continuar';
}

/** Texto de «Continuar (3 de 9)» para los botones de entrada. */
export function entryLabel(items: string[], done: ReadonlySet<string> | undefined, noun = 'Rezar ahora'): string {
  const d = countDone(items, done);
  if (d === 0 || d >= items.length) return noun;
  return `Continuar (${d + 1} de ${items.length})`;
}

export const playerHref = (routineId: string, index?: number): string => `/rezar/?r=${encodeURIComponent(routineId)}${index === undefined ? '' : `&i=${index}`}`;

// ── Estado guardado (localStorage) ─────────────────────────────────────────

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const store = (): Store | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const positionKey = (routineId: string, date: string) => `bc.rezar.pos|${routineId}|${date}`;

export function savePosition(routineId: string, date: string, index: number, s: Store | null = store()): void {
  try {
    s?.setItem(positionKey(routineId, date), String(index));
  } catch {
    /* sin almacenamiento */
  }
}

export function loadPosition(routineId: string, date: string, s: Store | null = store()): number | null {
  try {
    const v = s?.getItem(positionKey(routineId, date));
    return v && /^\d{1,3}$/.test(v) ? Number(v) : null;
  } catch {
    return null;
  }
}

export function clearPosition(routineId: string, date: string, s: Store | null = store()): void {
  try {
    s?.removeItem(positionKey(routineId, date));
  } catch {
    /* sin almacenamiento */
  }
}

const VOLVER_KEY = 'bc.rezar.volver';
const VOLVER_TTL_MS = 6 * 3_600_000;

/** Anota a dónde volver al terminar o salir del Rosario guiado (solo rutas internas de `/rezar/`). */
export function setVolver(url: string, now = Date.now(), s: Store | null = store()): void {
  if (!url.startsWith('/rezar/')) return;
  try {
    s?.setItem(VOLVER_KEY, JSON.stringify({ url, at: now }));
  } catch {
    /* sin almacenamiento */
  }
}

export function getVolver(now = Date.now(), s: Store | null = store()): string | null {
  try {
    const raw = s?.getItem(VOLVER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { url?: unknown; at?: unknown };
    if (typeof v.url !== 'string' || !v.url.startsWith('/rezar/') || typeof v.at !== 'number' || now - v.at > VOLVER_TTL_MS) return null;
    return v.url;
  } catch {
    return null;
  }
}

export function clearVolver(s: Store | null = store()): void {
  try {
    s?.removeItem(VOLVER_KEY);
  } catch {
    /* sin almacenamiento */
  }
}
