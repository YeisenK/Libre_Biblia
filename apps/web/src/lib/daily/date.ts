/** Fechas civiles `YYYY-MM-DD` en la zona horaria del usuario (por defecto la del dispositivo). */

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const isIsoDate = (s: string | null | undefined): s is string => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

function partsIn(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour') % 24, mi: g('minute'), s: g('second') };
}

/** Fecha de hoy `YYYY-MM-DD` en la zona indicada (o la del dispositivo). */
export function todayIso(tz?: string | null, now: Date = new Date()): string {
  if (tz && isValidTimeZone(tz)) {
    const p = partsIn(now, tz);
    return `${String(p.y).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  }
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Clave `MM-DD` del ciclo temático. */
export const mmdd = (iso: string) => iso.slice(5);

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const s = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Instante en que ocurre la hora `HH:MM` del día `iso` en la zona indicada (o la local). */
export function zonedInstant(iso: string, time: string, tz?: string | null): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  if (!tz || !isValidTimeZone(tz)) return new Date(y, m - 1, d, h, mi, 0, 0);
  const want = Date.UTC(y, m - 1, d, h, mi);
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = partsIn(new Date(t), tz);
    const got = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    const diff = want - got;
    if (diff === 0) break;
    t += diff;
  }
  return new Date(t);
}

export const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
