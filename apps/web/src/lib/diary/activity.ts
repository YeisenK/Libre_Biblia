/**
 * Lo que la app ya registró un día (solo lectura, para ver junto al diario).
 * Sin rachas, puntos ni estadísticas: solo qué se hizo ese día.
 */
import { getDb, type AppDb, type NovenaProgressRow, type RosarySessionRow, type RoutineLogRow, type RoutineRow } from '../db';
import { loadCatalog, itemTitle } from '../prayers/catalog';

export interface DayActivity {
  routines: { routineId: string; routineTitle: string; item: string; label: string }[];
  novenas: { novenaId: string; title: string; day: number }[];
  rosaries: { id: string; set: RosarySessionRow['set']; completed: boolean }[];
}

export const ROSARY_SET_LABEL: Record<RosarySessionRow['set'], string> = {
  joyful: 'Gozosos',
  luminous: 'Luminosos',
  sorrowful: 'Dolorosos',
  glorious: 'Gloriosos',
};

/** Fecha local YYYY-MM-DD de un instante ISO. */
export function localDateOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface ActivitySource {
  routineLog: RoutineLogRow[];
  routines: RoutineRow[];
  novenaProgress: NovenaProgressRow[];
  rosarySessions: RosarySessionRow[];
}

/** Función pura: arma la actividad de un día a partir de las tablas y de los títulos ya resueltos. */
export function buildDayActivity(date: string, src: ActivitySource, labelOf: (item: string) => string = (i) => i): DayActivity {
  const titles = new Map(src.routines.map((r) => [r.id, r.title]));
  const routines = src.routineLog
    .filter((r) => r.date === date)
    .map((r) => ({ routineId: r.routineId, routineTitle: titles.get(r.routineId) ?? 'Rutina', item: r.item, label: labelOf(r.item) }));
  const novenas = src.novenaProgress
    .flatMap((p) =>
      Object.entries(p.done)
        .filter(([, d]) => d === date)
        .map(([day]) => ({ novenaId: p.novenaId, title: labelOf(`novena:${p.novenaId}`), day: Number(day) })),
    )
    .sort((a, b) => a.day - b.day);
  const rosaries = src.rosarySessions
    .filter((s) => localDateOf(s.startedAt) === date)
    .map((s) => ({ id: s.id, set: s.set, completed: !!s.completedAt }));
  return { routines, novenas, rosaries };
}

export function isEmptyActivity(a: DayActivity): boolean {
  return !a.routines.length && !a.novenas.length && !a.rosaries.length;
}

/** Lee de la base de datos la actividad de un día (solo lectura). */
export async function loadDayActivity(date: string, db: AppDb = getDb()): Promise<DayActivity> {
  const [routineLog, routines, novenaProgress, rosarySessions] = await Promise.all([
    db.routineLog.where('date').equals(date).toArray(),
    db.routines.toArray(),
    db.novenaProgress.toArray(),
    db.rosarySessions.toArray(),
  ]);
  let labelOf = (i: string) => i;
  try {
    const cat = await loadCatalog(db);
    labelOf = (i) => itemTitle(cat, i);
  } catch {
    /* sin catálogo se muestran las claves */
  }
  return buildDayActivity(date, { routineLog, routines, novenaProgress, rosarySessions }, labelOf);
}
