import { beforeEach, describe, expect, it } from 'vitest';
import type { Novena } from '@bc/shared';
import { AppDb } from '../db';
import { abandonNovena, calendarDay, currentDay, daysBehind, feastTiming, getProgress, listCompleted, listInProgress, markDayDone, restartNovena, startingSoon, startNovena, unmarkDay } from './novenas';
import { createRoutine, doneForDate } from './routines';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-novenas-${n++}`);
});

const nov = (id = 'san-jose', days = 3, feast?: Novena['feast']): Novena =>
  ({ id, title: id, group: 'saints', description: '', introduction: '', purpose: '', nature: 'popular_piety', opening: [], closing: [], feast, days: Array.from({ length: days }, (_, i) => ({ day: i + 1, reflection: '', prayer: '' })) });

describe('novenas', () => {
  it('empieza con intención, conserva la que está en curso y reinicia', async () => {
    const a = await startNovena('san-jose', ' por mi familia ', db, new Date('2026-11-20T10:00:00Z'));
    expect(a.intention).toBe('por mi familia');
    const b = await startNovena('san-jose', undefined, db, new Date('2026-11-25T10:00:00Z'));
    expect(b.startedAt).toBe(a.startedAt);
    const r = await restartNovena('san-jose', undefined, db, new Date('2026-11-26T10:00:00Z'));
    expect(r).toMatchObject({ done: {}, intention: 'por mi familia', completedAt: null });
    expect(r.startedAt).toBe('2026-11-26T10:00:00.000Z');
  });

  it('día actual: primer día no hecho; completa al terminar y marca la rutina', async () => {
    const novena = nov();
    const r = await createRoutine({ title: 'noche', items: ['novena:san-jose'] }, db);
    await startNovena(novena.id, undefined, db);
    await markDayDone(novena, 1, { date: '2026-11-20', db });
    await markDayDone(novena, 3, { date: '2026-11-22', db });
    let p = (await getProgress(novena.id, db))!;
    expect(currentDay(p, 3)).toBe(2);
    expect(p.completedAt).toBeNull();
    expect((await doneForDate('2026-11-20', db)).get(r.id)?.has('novena:san-jose')).toBe(true);
    await markDayDone(novena, 2, { date: '2026-11-23', db, markRoutine: false });
    p = (await getProgress(novena.id, db))!;
    expect(currentDay(p, 3)).toBeNull();
    expect(p.completedAt).not.toBeNull();
    expect(await listInProgress(db)).toHaveLength(0);
    expect(await listCompleted(db)).toHaveLength(1);
    await unmarkDay(novena.id, 2, db);
    expect(currentDay((await getProgress(novena.id, db))!, 3)).toBe(2);
    expect(await db.prayerHistory.count()).toBe(3);
  });

  it('marcar un día sin haber empezado inicia la novena', async () => {
    const p = await markDayDone(nov(), 1, { db });
    expect(Object.keys(p.done)).toEqual(['1']);
  });

  it('abandonar borra el progreso', async () => {
    await startNovena('x', undefined, db);
    await abandonNovena('x', db);
    expect(await getProgress('x', db)).toBeUndefined();
  });

  it('sugerencia por calendario y retraso', () => {
    const p = { startedAt: '2026-11-20T08:00:00Z', done: { 1: '2026-11-20' } };
    expect(calendarDay(p, 9, '2026-11-20')).toBe(1);
    expect(calendarDay(p, 9, '2026-11-23')).toBe(4);
    expect(calendarDay(p, 9, '2027-01-01')).toBe(9);
    expect(daysBehind({ ...p, novenaId: 'x', completedAt: null, updatedAt: '' }, 9, '2026-11-23')).toBe(2);
  });

  it('fecha de inicio: 9 días antes de la fiesta, y la del año siguiente si ya pasó', () => {
    expect(feastTiming({ month: 3, day: 19 }, '2026-03-01')).toMatchObject({ feastDate: '2026-03-19', startDate: '2026-03-10', daysUntilStart: 9, daysUntilFeast: 18 });
    expect(feastTiming({ month: 3, day: 19 }, '2026-03-19').daysUntilFeast).toBe(0);
    expect(feastTiming({ month: 3, day: 19 }, '2026-03-20').feastDate).toBe('2027-03-19');
    expect(feastTiming({ month: 1, day: 5 }, '2026-12-30').feastDate).toBe('2027-01-05');
  });

  it('novenas que conviene empezar pronto', () => {
    const list = [nov('a', 9, { month: 12, day: 8, label: 'Inmaculada' }), nov('b', 9, { month: 6, day: 29, label: 'San Pedro' }), nov('c')];
    const soon = startingSoon(list, '2026-11-25', 14);
    expect(soon.map((x) => x.novena.id)).toEqual(['a']);
    expect(soon[0]!.timing.daysUntilStart).toBe(4);
  });
});
