import { liturgicalDay, parseIsoDate, type LiturgicalDay, type LiturgyOptions } from '../liturgy';

/**
 * Clave estable del día litúrgico para el leccionario.
 *
 * Familias de claves (el prefijo indica de qué se trata):
 *  - `cel:<id>[:<A|B|C>]`  domingos, solemnidades, fiestas y días especiales (id de liturgy.ts).
 *                          Primero se busca con ciclo; si las lecturas no dependen del ciclo, sin él.
 *  - `d:MM-DD`            santoral con lecturas propias en fecha fija (memorias y fiestas que no están
 *                          en liturgy.ts); solo se usa en días de feria.
 *  - `fer:ord:<sem>:<día>:<I|II>`  feria de Tiempo Ordinario (el año I/II cambia la primera lectura).
 *  - `fer:adv:<sem>:<día>`, `fer:advd:MM-DD` (17-24 dic), `fer:xmas:MM-DD` (hasta la Epifanía),
 *    `fer:postepi:<n>` (n.º de día tras la Epifanía), `fer:lent:<sem>:<día>`, `fer:easter:<sem>:<día>`;
 *    las de estos tiempos admiten un sufijo `:A|B|C` cuando las lecturas dependen del ciclo (se busca primero con ciclo).
 */

const pad = (n: number) => String(n).padStart(2, '0');

export interface LectionaryLookup {
  day: LiturgicalDay;
  /** Claves candidatas por orden de prioridad (la primera es la «principal»). */
  keys: string[];
  /** Clave de la feria del día (null si el día no es feria) */
  ferialKey: string | null;
  /** MM-DD si el día admite santoral propio por fecha */
  dateKey: string | null;
}

const MOVABLE_MEMORIALS = new Set(['mary-mother-church', 'immaculate-heart']);

function daysFromEpiphany(date: string, opts: LiturgyOptions): number {
  const { y, m, d } = parseIsoDate(date);
  let ep = Date.UTC(y, 0, 6);
  // La Epifanía cae entre el 2 y el 8 de enero; liturgicalDay dice cuál es
  for (let k = 2; k <= 8; k++) {
    if (liturgicalDay(`${y}-01-${pad(k)}`, opts).celebration?.id === 'epiphany') ep = Date.UTC(y, 0, k);
  }
  return Math.round((Date.UTC(y, m - 1, d) - ep) / 86400000);
}

export function lectionaryLookup(date: string, options: LiturgyOptions = {}): LectionaryLookup {
  const day = liturgicalDay(date, options);
  const { m, d } = parseIsoDate(date);
  const md = `${pad(m)}-${pad(d)}`;
  const cyc = day.sundayCycle;
  const cel = day.celebration;
  const wd = day.weekday;

  // Feria del día (también se calcula bajo una memoria libre, cuyas lecturas suelen ser las feriales)
  let ferial: string | null = null;
  if (!day.isSunday) {
    switch (day.season) {
      case 'ordinary':
        ferial = `fer:ord:${day.week}:${wd}:${day.weekdayCycle}`;
        break;
      case 'advent':
        ferial = m === 12 && d >= 17 ? `fer:advd:${md}` : `fer:adv:${day.week}:${wd}`;
        break;
      case 'lent':
        ferial = day.week !== null && day.week <= 5 ? `fer:lent:${day.week}:${wd}` : null;
        break;
      case 'easter':
        ferial = day.week !== null && day.week >= 2 ? `fer:easter:${day.week}:${wd}` : null;
        break;
      case 'christmas': {
        if (m === 12 && d >= 29) ferial = `fer:xmas:${md}`;
        else if (m === 1) {
          const n = daysFromEpiphany(date, options);
          ferial = n > 0 ? `fer:postepi:${n}` : `fer:xmas:${md}`;
        }
        break;
      }
      default:
        ferial = null;
    }
  }

  const keys: string[] = [];
  const strong = cel && (cel.rank <= 7 || cel.type === 'sunday' || cel.type === 'special');
  if (cel) {
    if (strong || MOVABLE_MEMORIALS.has(cel.id)) keys.push(`cel:${cel.id}:${cyc}`, `cel:${cel.id}`);
    else keys.push(`cel:${cel.id}`);
    // Fiestas de fecha fija (apóstoles, evangelistas, san Lorenzo…): sus lecturas propias están por fecha.
    if (strong && cel.type === 'feast' && !day.isSunday) keys.push(`d:${md}`);
  }
  let dateKey: string | null = null;
  if (!strong) {
    const dateOk = (day.season === 'ordinary' || day.season === 'easter' || (day.season === 'advent' && !(m === 12 && d >= 17))) && !day.isSunday;
    if (dateOk) {
      dateKey = md;
      keys.push(`d:${md}`);
    }
    if (ferial) {
      // En Adviento, Navidad, Cuaresma y Pascua algunas ferias cambian con el ciclo dominical (clave con ciclo primero)
      if (day.season !== 'ordinary') keys.push(`${ferial}:${cyc}`);
      keys.push(ferial);
    }
  }
  return { day, keys, ferialKey: ferial, dateKey };
}
