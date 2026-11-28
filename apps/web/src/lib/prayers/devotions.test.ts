import { beforeEach, describe, expect, it } from 'vitest';
import type { Novena, Prayer } from '@bc/shared';
import { AppDb } from '../db';
import { devotionsBySaint, relatedFeastNovenas } from './devotions';
import { activateDueReminders, endDate, isScheduled, nextFeastDate, reminderRoutineId, scheduleNovena, startToEndOn } from './schedule';
import { listInProgress, listScheduled, markDayDone, startNovena } from './novenas';
import { hasResponses, readGroupMode, writeGroupMode } from './groupMode';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-devotions-${n++}`);
});
const nov = (id: string, saints: string[] = [], feast?: Novena['feast'], days = 3): Novena =>
  ({ id, title: id, group: 'saints', description: '', introduction: '', purpose: '', nature: 'popular_piety', opening: [], closing: [], saints, feast, days: Array.from({ length: days }, (_, i) => ({ day: i + 1, reflection: '', prayer: '' })) });
const pr = (id: string, saints: string[] = []): Prayer => ({ id, title: id, categories: ['c'], nature: 'prayer', text: 't', saints });

describe('devociones por santo', () => {
  it('agrupa novenas y oraciones por santo', () => {
    const g = devotionsBySaint({ novenas: [nov('a', ['san-jose']), nov('b', ['san-jose', 'tomas-de-aquino'])], prayers: [pr('p', ['san-jose'])] });
    expect(g.find((x) => x.id === 'san-jose')).toMatchObject({ novenas: [{ id: 'a' }, { id: 'b' }], prayers: [{ id: 'p' }] });
    expect(g).toHaveLength(2);
  });
  it('novenas relacionadas con fiesta, sin la propia', () => {
    const f = { month: 3, day: 19, label: 'x' };
    const r = relatedFeastNovenas({ novenas: [nov('a', ['san-jose'], f), nov('b', ['san-jose'], f), nov('c', ['san-jose']), nov('d', ['otro'], f)] }, ['san-jose'], 'a');
    expect(r.map((x) => x.id)).toEqual(['b']);
  });
});

describe('programar novenas', () => {
  it('termina el día de la fiesta (fecha fija) y calcula móviles con la liturgia', () => {
    const feast = nextFeastDate(nov('san-jose', [], { month: 3, day: 19, label: 'x' }), '2027-03-01');
    expect(feast).toBe('2027-03-19');
    expect(startToEndOn('2027-03-19', 9)).toBe('2027-03-11');
    expect(endDate('2027-03-11', 9)).toBe('2027-03-19');
    // Pentecostés 2027 = 16 de mayo
    expect(nextFeastDate(nov('espiritu-santo'), '2027-05-01')).toBe('2027-05-16');
    // pasada la fiesta de este año, la del siguiente
    expect(nextFeastDate(nov('san-jose', [], { month: 3, day: 19, label: 'x' }), '2027-04-01')).toBe('2028-03-19');
  });

  it('varias novenas en paralelo conservan su progreso; la programada no cuenta como en curso', async () => {
    const now = new Date('2027-03-01T10:00:00Z');
    await startNovena('a', undefined, db, now);
    await markDayDone(nov('a'), 1, { date: '2027-03-01', db, now });
    await startNovena('b', undefined, db, now);
    await markDayDone(nov('b'), 1, { date: '2027-03-01', db, now });
    await scheduleNovena(nov('c'), '2027-03-11', { today: '2027-03-01', db, now });
    expect((await listInProgress(db, now)).map((r) => r.novenaId).sort()).toEqual(['a', 'b']);
    expect((await listScheduled(db, now)).map((r) => r.novenaId)).toEqual(['c']);
    await markDayDone(nov('a'), 2, { date: '2027-03-02', db, now });
    expect((await db.novenaProgress.get('b'))!.done).toEqual({ 1: '2027-03-01' });
    expect(isScheduled((await db.novenaProgress.get('c'))!, '2027-03-01')).toBe(true);
    expect(isScheduled((await db.novenaProgress.get('c'))!, '2027-03-11')).toBe(false);
  });

  it('«Comenzar» sobre una programada la empieza hoy', async () => {
    const now = new Date('2027-03-01T10:00:00Z');
    await scheduleNovena(nov('c'), '2027-03-11', { today: '2027-03-01', db, now });
    const r = await startNovena('c', undefined, db, now);
    expect(r.startedAt).toBe(now.toISOString());
  });

  it('recordatorio: rutina apagada hasta el inicio, se activa al llegar y se borra al terminar', async () => {
    const now = new Date('2027-03-01T10:00:00Z');
    await scheduleNovena(nov('c'), '2027-03-03', { today: '2027-03-01', reminderTime: '07:30', db, now });
    const id = reminderRoutineId('c');
    expect((await db.routines.get(id))!.reminder).toMatchObject({ enabled: false, time: '07:30' });
    expect(await activateDueReminders('2027-03-02', db)).toBe(0);
    expect(await activateDueReminders('2027-03-03', db)).toBe(1);
    expect((await db.routines.get(id))!.reminder!.enabled).toBe(true);
    await markDayDone(nov('c', [], undefined, 1), 1, { date: '2027-03-03', db, now: new Date('2027-03-03T10:00:00Z') });
    expect(await db.routines.get(id)).toBeUndefined();
  });

  it('sin recordatorio, reprogramar quita el aviso anterior', async () => {
    const now = new Date('2027-03-01T10:00:00Z');
    await scheduleNovena(nov('c'), '2027-03-03', { today: '2027-03-01', reminderTime: '07:30', db, now });
    await scheduleNovena(nov('c'), '2027-03-04', { today: '2027-03-01', reminderTime: null, db, now });
    expect(await db.routines.get(reminderRoutineId('c'))).toBeUndefined();
  });
});

describe('modo grupo', () => {
  it('detecta respuestas y guarda la preferencia', () => {
    expect(hasResponses('V. Señor\nR. ten piedad')).toBe(true);
    expect(hasResponses('Padre nuestro')).toBe(false);
    const store = new Map<string, string>();
    const st = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    expect(readGroupMode(st)).toBe(false);
    writeGroupMode(true, st);
    expect(readGroupMode(st)).toBe(true);
    writeGroupMode(false, st);
    expect(readGroupMode(st)).toBe(false);
  });
});
