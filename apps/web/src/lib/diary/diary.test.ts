import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb, type DiaryEntryRow } from '../db';
import { createEntry, deleteEntry, listAll, listByDate, listByKind, listByMonth, searchEntries, updateEntry } from './store';
import { DIARY_KIND_LABEL, filterEntries, groupByDay, daysWithEntries, isDiaryDate, matchesQuery, monthGrid, normalize, parseRef, refLabel, shiftMonth, validateDraft } from './model';
import { buildDayActivity, localDateOf, isEmptyActivity } from './activity';
import { decryptDiary, encryptDiary, isDiaryEnvelope, PBKDF2_ITERATIONS, WRONG_PASSWORD } from './crypto';
import { exportBackup, hasEncryptedDiary, importBackup, parseBackup } from '../backup';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-diary-${n++}`);
});

const at = (iso: string) => new Date(iso);

describe('modelo del diario', () => {
  it('valida fechas reales y tipos conocidos', () => {
    expect(isDiaryDate('2026-11-26')).toBe(true);
    expect(isDiaryDate('2026-02-30')).toBe(false);
    expect(isDiaryDate('26-11-2026')).toBe(false);
    const bad = validateDraft({ date: '2026-11-26', kind: 'otro' as DiaryEntryRow['kind'], text: 'x' });
    expect(bad.ok).toBe(false);
  });

  it('exige texto, limpia espacios y descarta el estado fuera de intenciones', () => {
    expect(validateDraft({ date: '2026-11-26', kind: 'note', text: '   ' }).ok).toBe(false);
    const ok = validateDraft({ date: '2026-11-26', kind: 'reflection', text: '  Hola  ', title: ' ', refs: ['bible:Jn 8,12', 'bible:Jn 8,12', ''], status: 'atendida' });
    expect(ok).toEqual({ ok: true, value: { date: '2026-11-26', kind: 'reflection', text: 'Hola', refs: ['bible:Jn 8,12'] } });
    const intent = validateDraft({ date: '2026-11-26', kind: 'intention', text: 'Por mi madre', status: 'encomendada' });
    expect(intent.ok && intent.value.status).toBe('encomendada');
  });

  it('rechaza referencias con formato desconocido', () => {
    expect(validateDraft({ date: '2026-11-26', kind: 'note', text: 'x', refs: ['web:algo'] }).ok).toBe(false);
  });

  it('agrupa por día, del más reciente al más antiguo', () => {
    const rows = [
      { id: 'a', date: '2026-11-01', kind: 'note', text: 'a', createdAt: '2026-11-01T08:00:00Z', updatedAt: '' },
      { id: 'b', date: '2026-11-03', kind: 'note', text: 'b1', createdAt: '2026-11-03T08:00:00Z', updatedAt: '' },
      { id: 'c', date: '2026-11-03', kind: 'note', text: 'b2', createdAt: '2026-11-03T20:00:00Z', updatedAt: '' },
    ] as DiaryEntryRow[];
    const g = groupByDay(rows);
    expect(g.map((x) => x.date)).toEqual(['2026-11-03', '2026-11-01']);
    expect(g[0]!.entries.map((e) => e.id)).toEqual(['c', 'b']);
    expect([...daysWithEntries(rows)].sort()).toEqual(['2026-11-01', '2026-11-03']);
  });

  it('busca sin distinguir acentos ni mayúsculas en título, texto y referencias', () => {
    const e = { id: 'x', date: '2026-11-01', kind: 'reflection', title: 'Oración', text: 'Gracias por la Eucaristía', refs: ['bible:Jn 8,12', 'saint:jose'], createdAt: '', updatedAt: '' } as DiaryEntryRow;
    expect(normalize('ÁRBOL')).toBe('arbol');
    expect(matchesQuery(e, 'eucaristia')).toBe(true);
    expect(matchesQuery(e, 'oracion gracias')).toBe(true);
    expect(matchesQuery(e, 'Jn 8')).toBe(true);
    expect(matchesQuery(e, 'gracias paz')).toBe(false);
    expect(filterEntries([e], { kind: 'note' })).toEqual([]);
    expect(filterEntries([e], { kind: 'reflection', date: '2026-11-01' })).toHaveLength(1);
  });

  it('cuadrícula mensual con semanas de lunes a domingo', () => {
    // 1 de noviembre de 2026 es domingo: 6 celdas vacías antes.
    const w = monthGrid(2026, 11);
    expect(w.every((x) => x.length === 7)).toBe(true);
    expect(w[0]!.slice(0, 6).every((c) => c.date === null)).toBe(true);
    expect(w[0]![6]!.date).toBe('2026-11-01');
    expect(w.flat().filter((c) => c.date).length).toBe(30);
    expect(monthGrid(2026, 2).flat().filter((c) => c.date).length).toBe(28);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('referencias: lectura legible', () => {
    expect(parseRef('prayer:padre-nuestro')).toEqual({ kind: 'prayer', id: 'padre-nuestro' });
    expect(parseRef('otra')).toBeNull();
    expect(refLabel('bible:Jn 8,12')).toBe('Jn 8,12');
    expect(refLabel('novena:san-jose', (_k, id) => `Novena a ${id}`)).toBe('Novena a san-jose');
    expect(DIARY_KIND_LABEL.intention).toBe('Intención de oración');
  });
});

describe('acceso a Dexie', () => {
  it('crea, lista por fecha y tipo, edita y borra', async () => {
    const a = await createEntry({ date: '2026-11-26', kind: 'gratitude', text: 'Por la paz', refs: ['bible:Fil 4,7'] }, db, at('2026-11-26T09:00:00Z'));
    await createEntry({ date: '2026-11-26', kind: 'intention', text: 'Por Ana', status: 'encomendada' }, db, at('2026-11-26T10:00:00Z'));
    await createEntry({ date: '2026-12-01', kind: 'gratitude', text: 'Otro día' }, db);

    expect((await listByDate('2026-11-26', db)).map((e) => e.kind)).toEqual(['intention', 'gratitude']);
    expect(await listByMonth('2026-11', db)).toHaveLength(2);
    expect(await listByKind('gratitude', db)).toHaveLength(2);
    expect((await listAll(db))[0]!.date).toBe('2026-12-01');

    const e2 = await updateEntry(a.id, { text: 'Por la paz verdadera', kind: 'reflection', status: 'atendida' }, db, at('2026-11-27T09:00:00Z'));
    expect(e2.text).toBe('Por la paz verdadera');
    expect(e2.status).toBeUndefined();
    expect(e2.createdAt).toBe(a.createdAt);
    expect(e2.updatedAt).toBe('2026-11-27T09:00:00.000Z');

    await deleteEntry(a.id, db);
    expect(await db.diaryEntries.get(a.id)).toBeUndefined();
  });

  it('no guarda borradores inválidos', async () => {
    await expect(createEntry({ date: 'mal', kind: 'note', text: 'x' }, db)).rejects.toThrow(/fecha/);
    await expect(updateEntry('no-existe', { text: 'x' }, db)).rejects.toThrow(/ya no existe/);
    expect(await db.diaryEntries.count()).toBe(0);
  });

  it('busca en el texto de todas las entradas', async () => {
    await createEntry({ date: '2026-11-02', kind: 'reading', title: 'Salmo 23', text: 'El Señor es mi pastor' }, db);
    await createEntry({ date: '2026-11-03', kind: 'note', text: 'Compra pan' }, db);
    const r = await searchEntries('pastor', db);
    expect(r.map((e) => e.date)).toEqual(['2026-11-02']);
  });
});

describe('actividad del día (solo lectura)', () => {
  it('reúne rutinas, novenas y rosarios de la fecha sin contar nada', () => {
    const a = buildDayActivity(
      '2026-11-20',
      {
        routineLog: [{ key: '2026-11-20|r1|rosary', date: '2026-11-20', routineId: 'r1', item: 'rosary', doneAt: '' }, { key: 'x', date: '2026-11-19', routineId: 'r1', item: 'gospel', doneAt: '' }],
        routines: [{ id: 'r1', title: 'Mañana', moment: 'morning', items: [], reminder: null, order: 0, createdAt: '', updatedAt: '' }],
        novenaProgress: [{ novenaId: 'san-jose', startedAt: '', done: { 1: '2026-11-19', 2: '2026-11-20' }, completedAt: null, updatedAt: '' }],
        rosarySessions: [{ id: 's', set: 'joyful', mode: 'digital', step: 20, optionsKey: '', startedAt: '2026-11-20T12:00:00', updatedAt: '', completedAt: '2026-11-20T12:30:00' }],
      },
      (i) => (i === 'rosary' ? 'Santo Rosario' : i),
    );
    expect(a.routines).toEqual([{ routineId: 'r1', routineTitle: 'Mañana', item: 'rosary', label: 'Santo Rosario' }]);
    expect(a.novenas).toEqual([{ novenaId: 'san-jose', title: 'novena:san-jose', day: 2 }]);
    expect(a.rosaries).toEqual([{ id: 's', set: 'joyful', completed: true }]);
    expect(isEmptyActivity(buildDayActivity('2026-01-01', { routineLog: [], routines: [], novenaProgress: [], rosarySessions: [] }))).toBe(true);
    expect(localDateOf('2026-11-20T12:00:00')).toBe('2026-11-20');
  });
});

describe('cifrado del diario', () => {
  const entries = (): DiaryEntryRow[] => [{ id: 'e1', date: '2026-11-26', kind: 'purpose', title: 'Mi propósito', text: 'Rezar cada mañana', createdAt: '2026-11-26T08:00:00Z', updatedAt: '2026-11-26T08:00:00Z' }];

  it('cifra y descifra con la contraseña correcta, con sal e IV aleatorios', async () => {
    const env1 = await encryptDiary(entries(), 'contraseña-larga', 200_000);
    const env2 = await encryptDiary(entries(), 'contraseña-larga', 200_000);
    expect(isDiaryEnvelope(env1)).toBe(true);
    expect(env1.iterations).toBe(PBKDF2_ITERATIONS);
    expect(env1.data).not.toContain('Rezar');
    expect(env1.salt).not.toBe(env2.salt);
    expect(env1.iv).not.toBe(env2.iv);
    expect(await decryptDiary(env1, 'contraseña-larga')).toEqual(entries());
  });

  it('contraseña incorrecta falla con mensaje limpio', async () => {
    const env = await encryptDiary(entries(), 'contraseña-larga', 200_000);
    await expect(decryptDiary(env, 'otra-contraseña')).rejects.toThrow(WRONG_PASSWORD);
  });

  it('datos alterados fallan (autenticación AES-GCM) y sobres no válidos se rechazan', async () => {
    const env = await encryptDiary(entries(), 'contraseña-larga', 200_000);
    const tampered = { ...env, data: env.data.slice(0, -4) + (env.data.endsWith('AAAA') ? 'BBBB' : 'AAAA') };
    await expect(decryptDiary(tampered, 'contraseña-larga')).rejects.toThrow(WRONG_PASSWORD);
    await expect(decryptDiary({ ...env, iterations: 10 }, 'contraseña-larga')).rejects.toThrow(/no soportado/);
    await expect(decryptDiary({ format: 'otro' } as never, 'x')).rejects.toThrow(/formato/);
  });

  it('no cifra con contraseñas cortas', async () => {
    await expect(encryptDiary(entries(), 'corta')).rejects.toThrow(/al menos 8/);
  });
});

describe('copia de seguridad con diario', () => {
  const seed = async () => {
    await createEntry({ date: '2026-11-26', kind: 'reflection', text: 'Hoy di gracias' }, db, at('2026-11-26T08:00:00Z'));
  };

  it('sin casilla el diario no sale de la app', async () => {
    await seed();
    const b = await exportBackup(db);
    expect(b.diary).toBeUndefined();
    expect(JSON.stringify(b)).not.toContain('Hoy di gracias');
  });

  it('con contraseña el diario va cifrado y se restaura pidiendo la contraseña', async () => {
    await seed();
    const json = JSON.stringify(await exportBackup(db, { diaryPassword: 'mi-clave-secreta' }));
    expect(json).not.toContain('Hoy di gracias');
    expect(hasEncryptedDiary(json)).toBe(true);

    const other = new AppDb(`test-diary-restore-${n++}`);
    const sinClave = await importBackup(other, json);
    expect(sinClave).toMatchObject({ diaryEntries: 0, diarySkipped: true });
    expect(await other.diaryEntries.count()).toBe(0);

    await expect(importBackup(other, json, { diaryPassword: 'clave-equivocada' })).rejects.toThrow(WRONG_PASSWORD);
    expect(await other.diaryEntries.count()).toBe(0);

    const ok = await importBackup(other, json, { diaryPassword: 'mi-clave-secreta' });
    expect(ok).toMatchObject({ diaryEntries: 1, diarySkipped: false });
    expect((await listAll(other))[0]!.text).toBe('Hoy di gracias');
    // Segunda restauración: no duplica
    expect((await importBackup(other, json, { diaryPassword: 'mi-clave-secreta' })).diaryEntries).toBe(0);
  });

  it('las copias antiguas y el validador ignoran un diario mal formado', () => {
    expect(parseBackup(JSON.stringify({ app: 'biblia-catolica', format: 1, diary: { nada: 1 } })).diary).toBeUndefined();
    expect(hasEncryptedDiary('no json')).toBe(false);
  });
});
