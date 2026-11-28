/**
 * Un día del calendario: la jornada litúrgica (liturgy.ts, con el calendario elegido) más los santos
 * del paquete `saints` que se celebran o se omiten ese día según la precedencia.
 */
import { liturgicalDay, type LiturgicalDay, type LiturgyOptions, type Saint, type SaintCelebration } from '@bc/shared';
import { celebrationFor, rankNumber, type SaintCatalog } from '../saints/catalog';

export interface SaintEntry {
  saint: Saint;
  celebration: SaintCelebration;
  /** Rango en la Tabla de precedencia */
  rank: number;
  /** false si el día litúrgico lo omite (Cuaresma, domingo, solemnidad mayor…) */
  celebrated: boolean;
}

export interface CalendarDayInfo {
  iso: string;
  day: LiturgicalDay;
  /** Santo con mayor rango entre los celebrados (null si ninguno) */
  primary: SaintEntry | null;
  /** Todos los santos de la fecha, ordenados por rango */
  saints: SaintEntry[];
}

export function saintsOnDate(cat: SaintCatalog | null | undefined, iso: string, day: LiturgicalDay): SaintEntry[] {
  if (!cat || cat.empty) return [];
  const md = iso.slice(5);
  const winnerRank = day.celebration?.rank ?? 99;
  const out: SaintEntry[] = [];
  for (const s of cat.byDate.get(md) ?? []) {
    const c = celebrationFor(s, md, day.calendar);
    if (!c) continue;
    // Sin rango litúrgico (devoción popular o santo solo del Martirologio): se lista, nunca «se celebra».
    if (c.rank === 'none') {
      out.push({ saint: s, celebration: c, rank: 14, celebrated: false });
      continue;
    }
    // El rango depende del calendario de la propia celebración (una fiesta del general es 7 aunque el usuario use el de México).
    const rank = rankNumber(c.rank, c.calendar);
    out.push({ saint: s, celebration: c, rank, celebrated: rank < day.baseRank && rank <= winnerRank });
  }
  return out.sort((a, b) => a.rank - b.rank || a.saint.name.localeCompare(b.saint.name, 'es'));
}

export function calendarDay(iso: string, options: LiturgyOptions, cat?: SaintCatalog | null): CalendarDayInfo {
  const day = liturgicalDay(iso, options);
  const saints = saintsOnDate(cat, iso, day);
  return { iso, day, primary: saints.find((e) => e.celebrated) ?? null, saints };
}

/** Santo a mostrar como «santo del día»: el celebrado; si no hay, el de mayor rango aunque la liturgia lo omita. */
export function saintOfDay(info: CalendarDayInfo): { entry: SaintEntry; celebrated: boolean } | null {
  if (info.primary) return { entry: info.primary, celebrated: true };
  const e = info.saints[0];
  return e ? { entry: e, celebrated: false } : null;
}

/** Fechas «YYYY-MM-DD» de un mes (mes 1-12). */
export function daysOfMonth(year: number, month: number): string[] {
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
}
