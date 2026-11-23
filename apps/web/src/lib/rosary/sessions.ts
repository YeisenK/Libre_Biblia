/**
 * Sesiones del Rosario en Dexie (`rosarySessions`): rezo en curso, historial y estadísticas.
 * Una sesión sin `completedAt` es un rezo en curso; solo se mantiene una.
 */
import { MYSTERY_SET_LABEL, type MysterySet, type RosaryData } from '@bc/shared';
import { getDb, type AppDb, type RosarySessionRow } from '../db';
import { shiftIso, todayIso } from '../daily/date';
import { buildSteps, firstStepOfDecade, optionsKey, parseOptionsKey, phaseOf, type RosaryOptions } from './flow';

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

export interface NewSession {
  set: MysterySet;
  mode: 'digital' | 'physical';
  options: RosaryOptions;
  intention?: string;
}

/** Rezo en curso (el más reciente sin terminar), o null. */
export async function getActiveSession(db: AppDb = getDb()): Promise<RosarySessionRow | null> {
  const rows = await db.rosarySessions.orderBy('updatedAt').reverse().filter((r) => !r.completedAt).limit(1).toArray();
  return rows[0] ?? null;
}

export const getSession = (id: string, db: AppDb = getDb()) => db.rosarySessions.get(id);

/** Crea un rezo nuevo; descarta cualquier rezo en curso anterior (solo hay uno). */
export async function createSession(n: NewSession, db: AppDb = getDb(), now: Date = new Date()): Promise<RosarySessionRow> {
  const at = now.toISOString();
  const row: RosarySessionRow = {
    id: newId(),
    set: n.set,
    mode: n.mode,
    step: 0,
    optionsKey: optionsKey(n.options),
    startedAt: at,
    updatedAt: at,
    completedAt: null,
    ...(n.intention?.trim() ? { intention: n.intention.trim() } : {}),
  };
  await db.transaction('rw', db.rosarySessions, async () => {
    const open = await db.rosarySessions.filter((r) => !r.completedAt).primaryKeys();
    if (open.length) await db.rosarySessions.bulkDelete(open);
    await db.rosarySessions.put(row);
  });
  return row;
}

/** Escritura ligera al avanzar: solo paso y marca de tiempo. */
export async function saveStep(id: string, step: number, db: AppDb = getDb(), now: Date = new Date()): Promise<void> {
  await db.rosarySessions.update(id, { step, updatedAt: now.toISOString() });
}

/** Termina el rezo: lo marca completado y lo anota en el historial de oración. */
export async function completeSession(id: string, db: AppDb = getDb(), now: Date = new Date()): Promise<RosarySessionRow | null> {
  const row = await db.rosarySessions.get(id);
  if (!row) return null;
  if (row.completedAt) return row;
  const at = now.toISOString();
  const done = { ...row, completedAt: at, updatedAt: at };
  await db.transaction('rw', db.rosarySessions, db.prayerHistory, async () => {
    await db.rosarySessions.put(done);
    await db.prayerHistory.add({ key: `rosary:${row.set}`, title: `Santo Rosario · ${MYSTERY_SET_LABEL[row.set]}`, at });
  });
  return done;
}

/** Rezos terminados, del más reciente al más antiguo. */
export async function listHistory(db: AppDb = getDb()): Promise<RosarySessionRow[]> {
  const rows = await db.rosarySessions.toArray();
  return rows.filter((r) => r.completedAt).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export const deleteSession = (id: string, db: AppDb = getDb()) => db.rosarySessions.delete(id);

/** Abandona el rezo en curso (sin anotarlo en el historial). */
export async function discardActive(db: AppDb = getDb()): Promise<void> {
  const open = await db.rosarySessions.filter((r) => !r.completedAt).primaryKeys();
  if (open.length) await db.rosarySessions.bulkDelete(open);
}

// ── Reanudar ───────────────────────────────────────────────────────────────

export type ResumePlan =
  | { kind: 'resume'; step: number }
  | { kind: 'ask'; /** misterio (0 = inicio, 6 = final) en el que estaba */ phase: number; restartStep: number; sameMysteryStep: number };

/**
 * Decide cómo reanudar. Si las opciones actuales coinciden con las del rezo, se continúa en el mismo paso.
 * Si cambiaron, el recorrido ya no coincide: se ofrece empezar de nuevo o continuar al comienzo del mismo
 * misterio con los pasos nuevos.
 */
export function planResume(session: Pick<RosarySessionRow, 'set' | 'step' | 'optionsKey'>, rosary: RosaryData, current: RosaryOptions): ResumePlan {
  const key = optionsKey(current);
  const oldOpts = parseOptionsKey(session.optionsKey);
  const oldSteps = oldOpts ? buildSteps(rosary, session.set, oldOpts) : null;
  if (session.optionsKey === key && oldSteps) return { kind: 'resume', step: Math.min(session.step, oldSteps.length - 1) };
  const phase = oldSteps ? phaseOf(oldSteps, Math.min(session.step, oldSteps.length - 1)) : 0;
  const steps = buildSteps(rosary, session.set, current);
  const closing = steps.findIndex((s) => s.id.startsWith('final-') || s.id === 'salve');
  const sameMysteryStep = phase === 0 ? 0 : phase === 6 ? Math.max(0, closing) : Math.max(0, firstStepOfDecade(steps, phase));
  return { kind: 'ask', phase, restartStep: 0, sameMysteryStep };
}

/** Aplica «continuar en el mismo misterio»: sustituye las opciones de la sesión y coloca el paso. */
export async function realignSession(id: string, options: RosaryOptions, step: number, db: AppDb = getDb(), now: Date = new Date()): Promise<void> {
  await db.rosarySessions.update(id, { optionsKey: optionsKey(options), step, updatedAt: now.toISOString() });
}

// ── Estadísticas ───────────────────────────────────────────────────────────

export interface RosaryStats {
  total: number;
  /** Rosarios completados en el mes de `today` */
  thisMonth: number;
  /** Días seguidos con rosario, contando hasta hoy o hasta ayer */
  streak: number;
}

export function rosaryStats(rows: Pick<RosarySessionRow, 'completedAt'>[], today: string, tz?: string | null): RosaryStats {
  const days = new Set<string>();
  let thisMonth = 0;
  let total = 0;
  for (const r of rows) {
    if (!r.completedAt) continue;
    total++;
    const d = todayIso(tz, new Date(r.completedAt));
    days.add(d);
    if (d.slice(0, 7) === today.slice(0, 7)) thisMonth++;
  }
  let cursor = days.has(today) ? today : shiftIso(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftIso(cursor, -1);
  }
  return { total, thisMonth, streak };
}
