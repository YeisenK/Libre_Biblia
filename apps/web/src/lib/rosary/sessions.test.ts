// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RosaryData } from '@bc/shared';
import { AppDb } from '../db';
import { completeSession, createSession, getActiveSession, listHistory, planResume, realignSession, rosaryStats, saveStep } from './sessions';
import { buildSteps, firstStepOfDecade } from './flow';

const rosary: RosaryData = {
  sets: [],
  mysteries: ([1, 2, 3, 4, 5] as const).map((n) => ({ set: 'joyful' as const, n, title: `M${n}`, ref: 'Lc 1,26', reflection: 'r', teaching: 't' })),
  extras: [{ id: 'fatima', title: 'Fátima', place: 'after_decade', prayer: 'oracion-fatima', defaultOn: true }],
  introduction: '',
};
const off = { reflections: false, passages: false, extras: [] };

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-rosary-${n++}`);
});

describe('sesiones', () => {
  it('crea, guarda el paso, reanuda y completa con historial', async () => {
    const s = await createSession({ set: 'joyful', mode: 'digital', options: off, intention: ' por la paz ' }, db);
    expect(s.intention).toBe('por la paz');
    await saveStep(s.id, 12, db);
    const active = await getActiveSession(db);
    expect(active?.step).toBe(12);
    await completeSession(s.id, db, new Date('2026-11-22T10:00:00'));
    expect(await getActiveSession(db)).toBeNull();
    expect((await listHistory(db)).map((r) => r.id)).toEqual([s.id]);
    const h = await db.prayerHistory.toArray();
    expect(h[0]).toMatchObject({ key: 'rosary:joyful', title: 'Santo Rosario · Misterios gozosos' });
  });

  it('solo mantiene un rezo en curso', async () => {
    await createSession({ set: 'joyful', mode: 'digital', options: off }, db);
    const b = await createSession({ set: 'glorious', mode: 'physical', options: off }, db);
    expect((await getActiveSession(db))?.id).toBe(b.id);
    expect(await db.rosarySessions.count()).toBe(1);
  });

  it('completar dos veces no duplica el historial', async () => {
    const s = await createSession({ set: 'joyful', mode: 'digital', options: off }, db);
    await completeSession(s.id, db);
    await completeSession(s.id, db);
    expect(await db.prayerHistory.count()).toBe(1);
  });
});

describe('planResume', () => {
  it('mismas opciones: continúa en el mismo paso', async () => {
    const s = await createSession({ set: 'joyful', mode: 'digital', options: off }, db);
    expect(planResume({ ...s, step: 20 }, rosary, off)).toEqual({ kind: 'resume', step: 20 });
  });

  it('opciones distintas: pregunta y lleva al inicio del mismo misterio', () => {
    const old = buildSteps(rosary, 'joyful', off);
    const step = old.findIndex((x) => x.id === 'd3-ave-4');
    const now = { reflections: true, passages: true, extras: ['fatima'] };
    const plan = planResume({ set: 'joyful', step, optionsKey: 'r0p0x' }, rosary, now);
    expect(plan.kind).toBe('ask');
    if (plan.kind === 'ask') {
      expect(plan.phase).toBe(3);
      expect(plan.sameMysteryStep).toBe(firstStepOfDecade(buildSteps(rosary, 'joyful', now), 3));
    }
  });

  it('realignSession cambia las opciones y el paso', async () => {
    const s = await createSession({ set: 'joyful', mode: 'digital', options: off }, db);
    await realignSession(s.id, { reflections: true, passages: false, extras: [] }, 30, db);
    expect(await getActiveSession(db)).toMatchObject({ step: 30, optionsKey: 'r1p0x' });
  });
});

describe('rosaryStats', () => {
  const at = (d: string) => ({ completedAt: `${d}T12:00:00` });
  it('racha, total y mes', () => {
    const rows = [at('2026-11-22'), at('2026-11-21'), at('2026-11-20'), at('2026-11-18'), at('2026-10-30'), { completedAt: null }];
    expect(rosaryStats(rows, '2026-11-22')).toEqual({ total: 5, thisMonth: 4, streak: 3 });
  });
  it('la racha sigue viva si el último fue ayer', () => {
    expect(rosaryStats([at('2026-11-21')], '2026-11-22').streak).toBe(1);
    expect(rosaryStats([at('2026-11-19')], '2026-11-22').streak).toBe(0);
  });
});
