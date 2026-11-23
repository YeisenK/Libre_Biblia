import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb } from '../db';
import {
  addItem, computeProgress, createFromTemplate, createRoutine, deleteRoutine, doneForDate, getRoutine, listRoutines, markItemDone, moveItem,
  pickRoutine, progressForDate, removeItem, reorder, routineForMoment, streak, toggleDone, updateRoutine,
} from './routines';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-routines-${n++}`);
});

describe('rutinas', () => {
  it('crea, lista en orden, actualiza y borra con su registro', async () => {
    const a = await createRoutine({ title: 'Mañana', moment: 'morning', items: ['prayer:angelus', 'prayer:angelus', 'rosary'] }, db);
    const b = await createRoutine({ title: '  ', items: [] }, db);
    expect(a.items).toEqual(['prayer:angelus', 'rosary']);
    expect(b.title).toBe('Mi rutina');
    expect((await listRoutines(db)).map((r) => r.id)).toEqual([a.id, b.id]);
    await updateRoutine(a.id, { title: 'Alba' }, db);
    expect((await getRoutine(a.id, db))?.title).toBe('Alba');
    await toggleDone(a.id, 'rosary', '2026-11-22', db);
    await deleteRoutine(a.id, db);
    expect(await getRoutine(a.id, db)).toBeUndefined();
    expect(await db.routineLog.count()).toBe(0);
  });

  it('crea desde una propuesta del paquete', async () => {
    const r = await createFromTemplate({ id: 't', title: 'Noche', moment: 'night', items: ['prayer:acto-de-contricion'] }, db);
    expect(r).toMatchObject({ title: 'Noche', moment: 'night', items: ['prayer:acto-de-contricion'] });
  });

  it('añade sin repetir, quita y mueve elementos', async () => {
    const r = await createRoutine({ title: 'x', items: ['a', 'b', 'c'] }, db);
    expect(await addItem(r.id, 'd', db)).toBe(true);
    expect(await addItem(r.id, 'a', db)).toBe(false);
    await removeItem(r.id, 'b', db);
    await moveItem(r.id, 2, 0, db);
    expect((await getRoutine(r.id, db))!.items).toEqual(['d', 'a', 'c']);
    expect(reorder([1, 2, 3], 0, 9)).toEqual([2, 3, 1]);
    expect(reorder([1, 2, 3], 5, 0)).toEqual([1, 2, 3]);
  });

  it('markItemDone marca el elemento en todas las rutinas de hoy que lo contienen', async () => {
    const a = await createRoutine({ title: 'a', items: ['novena:x', 'rosary'] }, db);
    const b = await createRoutine({ title: 'b', items: ['novena:x'] }, db);
    const c = await createRoutine({ title: 'c', items: ['rosary'] }, db);
    expect(await markItemDone('novena:x', '2026-11-22', db)).toBe(2);
    await markItemDone('novena:x', '2026-11-22', db); // idempotente
    const m = await doneForDate('2026-11-22', db);
    expect(m.get(a.id)?.has('novena:x')).toBe(true);
    expect(m.get(b.id)?.has('novena:x')).toBe(true);
    expect(m.has(c.id)).toBe(false);
    expect(await db.routineLog.count()).toBe(2);
  });

  it('toggleDone alterna y progressForDate cuenta', async () => {
    const a = await createRoutine({ title: 'a', items: ['p', 'q'] }, db);
    await createRoutine({ title: 'b', items: ['r', 's'] }, db);
    expect(await toggleDone(a.id, 'p', '2026-11-22', db)).toBe(true);
    const p = await progressForDate('2026-11-22', db);
    expect(p).toMatchObject({ done: 1, total: 4, ratio: 0.25 });
    expect(p.byRoutine[a.id]).toEqual({ done: 1, total: 2 });
    expect(await toggleDone(a.id, 'p', '2026-11-22', db)).toBe(false);
    expect((await progressForDate('2026-11-22', db)).done).toBe(0);
    expect(computeProgress([], new Map()).ratio).toBe(0);
  });

  it('elige la rutina del momento y, si no hay, la siguiente con pendientes', async () => {
    const m = await createRoutine({ title: 'm', moment: 'morning', items: ['a'] }, db);
    const t = await createRoutine({ title: 't', moment: 'afternoon', items: ['b'] }, db);
    const v = await createRoutine({ title: 'v', moment: 'night', items: [] }, db);
    const all = await listRoutines(db);
    expect(pickRoutine(all, 'morning')?.id).toBe(m.id);
    expect(pickRoutine(all, 'midday')?.id).toBe(t.id); // mediodía y tarde comparten franja
    expect(pickRoutine(all, 'night')?.id).toBe(m.id); // la de noche está vacía: la siguiente es la de mañana
    const done = new Map([[m.id, new Set(['a'])]]);
    expect(pickRoutine(all, 'night', done)?.id).toBe(t.id);
    expect(pickRoutine([], 'morning')).toBeNull();
    expect(v.items).toEqual([]);
    expect((await routineForMoment('morning', db))?.id).toBe(m.id);
  });

  it('la racha cuenta días seguidos y no se rompe hasta que acaba hoy', async () => {
    const a = await createRoutine({ title: 'a', items: ['p'] }, db);
    expect(await streak(db, '2026-11-22')).toBe(0);
    for (const d of ['2026-11-19', '2026-11-20', '2026-11-21']) await toggleDone(a.id, 'p', d, db);
    expect(await streak(db, '2026-11-22')).toBe(3);
    await toggleDone(a.id, 'p', '2026-11-22', db);
    expect(await streak(db, '2026-11-22')).toBe(4);
    expect(await streak(db, '2026-11-25')).toBe(0);
  });
});

describe('rutinas predeterminadas', () => {
  const T = [
    { id: 'manana', title: 'Mañana', moment: 'morning' as const, items: ['prayer:a'] },
    { id: 'tarde', title: 'Tarde', moment: 'afternoon' as const, items: ['prayer:b'] },
    { id: 'noche', title: 'Noche', moment: 'night' as const, items: ['prayer:c'] },
    { id: 'breve', title: 'Breve', moment: 'morning' as const, items: ['prayer:d'] },
  ];
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
  it('crea mañana, tarde (con Rosario) y noche una sola vez', async () => {
    const { ensureDefaultRoutines } = await import('./routines');
    const st = mem();
    expect(await ensureDefaultRoutines(T, db, st)).toBe(true);
    const rs = await listRoutines(db);
    expect(rs.map((r) => r.title)).toEqual(['Mañana', 'Tarde', 'Noche']);
    expect(rs[1]!.items).toContain('rosary');
    await deleteRoutine(rs[0]!.id, db);
    expect(await ensureDefaultRoutines(T, db, st)).toBe(false);
    expect(await listRoutines(db)).toHaveLength(2);
  });
  it('no toca rutinas propias existentes', async () => {
    const { ensureDefaultRoutines } = await import('./routines');
    await createRoutine({ title: 'Mía', items: [] }, db);
    await ensureDefaultRoutines(T, db, mem());
    expect((await listRoutines(db)).map((r) => r.title)).toEqual(['Mía']);
  });
});
