// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPlan, ROUTINE_MESSAGES, routineMessage, type NotifySettings } from './plan';

const base: NotifySettings = { notifyEnabled: true, notifyVerseTime: '08:00', notifyReading: false, notifyReadingTime: '20:00', notifyPrayer: false, notifyPrayerTime: '07:00', timeZone: 'America/Mexico_City' };
const verseFor = async (iso: string) => ({ title: `Ref ${iso}`, body: `Texto ${iso}` });

describe('plan de notificaciones', () => {
  it('programa 7 días con el texto concreto de cada día', async () => {
    const now = new Date('2026-11-20T10:00:00Z'); // 04:00 en México
    const plan = await buildPlan({ now, settings: base, verseFor });
    expect(plan).toHaveLength(7);
    expect(plan[0]).toMatchObject({ kind: 'verse', title: 'Ref 2026-11-20', body: 'Texto 2026-11-20', path: '/hoy/?d=2026-11-20' });
    expect(plan[0]!.at.toISOString()).toBe('2026-11-20T14:00:00.000Z');
    expect(plan[6]!.title).toBe('Ref 2026-11-26');
    expect(new Set(plan.map((p) => p.id)).size).toBe(7);
  });
  it('omite lo que ya pasó hoy', async () => {
    const now = new Date('2026-11-20T15:00:00Z'); // 09:00 en México
    const plan = await buildPlan({ now, settings: base, verseFor });
    expect(plan).toHaveLength(6);
    expect(plan[0]!.title).toBe('Ref 2026-11-21');
  });
  it('desactivado o sin texto no programa nada', async () => {
    const now = new Date('2026-11-20T10:00:00Z');
    expect(await buildPlan({ now, settings: { ...base, notifyEnabled: false }, verseFor })).toEqual([]);
    expect(await buildPlan({ now, settings: base, verseFor: async () => null })).toEqual([]);
  });
  it('recordatorios de lectura y oración con sus horas', async () => {
    const now = new Date('2026-11-20T10:00:00Z');
    const plan = await buildPlan({ now, settings: { ...base, notifyReading: true, notifyPrayer: true }, verseFor, days: 2 });
    expect(plan.filter((p) => p.kind === 'reading').map((p) => p.at.toISOString())).toEqual(['2026-11-21T02:00:00.000Z', '2026-11-22T02:00:00.000Z']);
    expect(plan.filter((p) => p.kind === 'prayer')[0]!.at.toISOString()).toBe('2026-11-20T13:00:00.000Z');
    expect(plan.find((p) => p.kind === 'reading')!.path).toBe('/leer/');
    expect(plan.map((p) => p.at.getTime())).toEqual([...plan.map((p) => p.at.getTime())].sort((a, b) => a - b));
  });
});

// ── Nativo con el plugin simulado ──
const plugin = {
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  createChannel: vi.fn(),
  schedule: vi.fn(),
  addListener: vi.fn(),
};
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: plugin }));
const nativeFlag = { v: true };
vi.mock('../native/platform', () => ({ isNative: () => Promise.resolve(nativeFlag.v) }));

describe('notificaciones nativas (plugin simulado)', () => {
  beforeEach(() => {
    Object.values(plugin).forEach((f) => f.mockReset());
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
    plugin.requestPermissions.mockResolvedValue({ display: 'granted' });
    plugin.getPending.mockResolvedValue({ notifications: [{ id: 5 }, { id: 6 }] });
    plugin.addListener.mockResolvedValue({ remove: vi.fn() });
    nativeFlag.v = true;
  });

  it('pide permiso y lo normaliza', async () => {
    const n = await import('./native');
    expect(await n.notificationPermission()).toBe('granted');
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt-with-rationale' });
    expect(await n.notificationPermission()).toBe('prompt');
    plugin.requestPermissions.mockResolvedValue({ display: 'denied' });
    expect(await n.requestNotificationPermission()).toBe('denied');
  });

  it('cancela lo pendiente y programa SIN alarmas exactas y con la ruta /hoy', async () => {
    const n = await import('./native');
    const plan = await buildPlan({ now: new Date('2026-11-20T10:00:00Z'), settings: base, verseFor, days: 2 });
    await n.applyPlan(plan);
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 5 }, { id: 6 }] });
    expect(plugin.createChannel).toHaveBeenCalledTimes(3); // palabra del día, oración y liturgia
    const arg = plugin.schedule.mock.calls[0]![0].notifications;
    expect(arg).toHaveLength(2);
    for (const x of arg) {
      expect(x.isExactNotification).toBe(false);
      expect(x.schedule.allowWhileIdle).toBe(false);
      expect(x.extra.path).toMatch(/^\/hoy\/\?d=/);
    }
    expect(arg[0].title).toBe('Ref 2026-11-20');
  });

  it('un plan vacío solo cancela', async () => {
    const n = await import('./native');
    await n.applyPlan([]);
    expect(plugin.schedule).not.toHaveBeenCalled();
    await n.cancelAllNotifications();
    expect(plugin.cancel).toHaveBeenCalledTimes(2);
  });

  it('tocar la notificación abre su ruta (y solo rutas internas)', async () => {
    const n = await import('./native');
    const seen: string[] = [];
    await n.listenNotificationTaps((p) => seen.push(p));
    const cb = plugin.addListener.mock.calls[0]![1];
    cb({ actionId: 'tap', notification: { extra: { path: '/hoy/?d=2026-11-21' } } });
    cb({ actionId: 'tap', notification: { extra: { path: 'https://malo.test' } } });
    cb({ actionId: 'tap', notification: {} });
    expect(seen).toEqual(['/hoy/?d=2026-11-21', '/hoy/', '/hoy/']);
  });

  it('modo Evangelio: la notificación usa el Evangelio del día (sin la Biblia, cita y celebración)', async () => {
    const { makeVerseFor } = await import('./sync');
    const { AppDb } = await import('../db');
    const { DEFAULT_SETTINGS } = await import('../settings');
    const db = new AppDb('test-notify-gospel');
    const v = await makeVerseFor({ ...DEFAULT_SETTINGS, verseMode: 'gospel' }, db)('2026-11-22');
    expect(v?.title).toBe('Evangelio: Mt 25,31-46');
    expect(v?.body).toMatch(/Rey del Universo/);
    // En modo ciclo temático no se usa el Evangelio (sin ciclo instalado no hay versículo)
    expect(await makeVerseFor({ ...DEFAULT_SETTINGS, verseMode: 'cycle' }, db)('2026-11-22')).toBeNull();
  });

  it('sincroniza: sin permiso no programa; con permiso programa; desactivado cancela', async () => {
    const { syncNotifications } = await import('./sync');
    const { AppDb } = await import('../db');
    const { DEFAULT_SETTINGS } = await import('../settings');
    const { installPack } = await import('../packs/install');
    const { entryFor, testHebrew: testBible, testDaily } = await import('@/test/fixtures');
    const db = new AppDb('test-notify-sync');
    await installPack(db, testBible, entryFor(testBible).entry, { catalogUrl: null });
    await installPack(db, testDaily, entryFor(testDaily).entry, { catalogUrl: null });
    const s = { ...DEFAULT_SETTINGS, notifyEnabled: true, notifyVerseTime: '09:00', timeZone: 'UTC', verseMode: 'cycle' as const };
    const now = new Date('2025-12-30T00:00:00Z');

    plugin.checkPermissions.mockResolvedValue({ display: 'denied' });
    expect(await syncNotifications(s, now, db)).toBe('no-permission');
    expect(plugin.schedule).not.toHaveBeenCalled();

    plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
    expect(await syncNotifications(s, now, db)).toBe('scheduled');
    const list = plugin.schedule.mock.calls[0]![0].notifications;
    // solo el 01-01 del ciclo sintético cae en esos 7 días
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Jn 3,16-17');
    expect(list[0].body).toContain('Jn tres dieciséis');

    expect(await syncNotifications({ ...s, notifyEnabled: false }, now, db)).toBe('off');
    expect(plugin.cancel).toHaveBeenCalled();
  });

  it('en la web no usa el plugin y programa temporizadores', async () => {
    nativeFlag.v = false;
    vi.useFakeTimers();
    const shown: string[] = [];
    vi.stubGlobal('Notification', class { static permission = 'granted'; constructor(t: string) { shown.push(t); } });
    vi.stubGlobal('window', { focus: vi.fn(), dispatchEvent: vi.fn() });
    const n = await import('./native');
    expect(await n.notificationPermission()).toBe('granted');
    const now = new Date('2026-11-20T10:00:00Z');
    const plan = await buildPlan({ now, settings: base, verseFor, days: 3 });
    await n.applyPlan(plan, now);
    expect(plugin.schedule).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5 * 3600_000);
    expect(shown).toEqual(['Ref 2026-11-20']); // solo lo de las próximas 24 h
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});

describe('recordatorios de rutinas', () => {
  const routine = (over: Partial<import('../db').RoutineRow> = {}): import('../db').RoutineRow => ({
    id: 'r1', title: 'Mañana', moment: 'morning', items: ['a', 'b', 'c', 'd', 'e'], reminder: { enabled: true, time: '07:00', days: [1, 5] }, order: 0, createdAt: '', updatedAt: '', ...over,
  });
  const now = new Date('2026-11-20T10:00:00Z'); // viernes 04:00 en México

  it('programa solo los días elegidos, con un mensaje de ánimo y la ruta de la rutina guiada', async () => {
    const plan = await buildPlan({ now, settings: base, verseFor: async () => null, routines: [routine()], days: 7 });
    expect(plan.map((p) => p.at.toISOString())).toEqual(['2026-11-20T13:00:00.000Z', '2026-11-23T13:00:00.000Z']);
    expect(plan[0]).toMatchObject({ kind: 'routine', title: 'Buenos días ☀️' });
    expect(ROUTINE_MESSAGES.morning).toContain(plan[0]!.body);
    expect(plan[0]!.path).toMatch(/^\/rezar\/\?r=/);
  });

  it('funciona con las notificaciones generales desactivadas y sin chocar de ids', async () => {
    const off = { ...base, notifyEnabled: false };
    const plan = await buildPlan({ now, settings: off, verseFor, routines: [routine(), routine({ id: 'r2', moment: 'any', title: 'Mi rutina', items: ['x'], reminder: { enabled: true, time: '21:00', days: [0, 1, 2, 3, 4, 5, 6] } })] });
    expect(plan.every((p) => p.kind === 'routine')).toBe(true);
    expect(ROUTINE_MESSAGES.any).toContain(plan.find((p) => p.title === 'Mi rutina')!.body);
    const all = await buildPlan({ now, settings: base, verseFor, routines: [routine()], days: 7 });
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    expect(all.filter((p) => p.kind === 'routine').every((p) => p.id >= 10_000)).toBe(true);
  });

  it('ignora recordatorios apagados, sin días, sin elementos o con hora inválida', async () => {
    const rs = [routine({ reminder: { enabled: false, time: '07:00', days: [5] } }), routine({ reminder: { enabled: true, time: '07:00', days: [] } }), routine({ items: [] }), routine({ reminder: { enabled: true, time: '7h', days: [5] } }), routine({ reminder: null })];
    expect(await buildPlan({ now, settings: { ...base, notifyEnabled: false }, verseFor, routines: rs })).toEqual([]);
  });

  it('sync programa recordatorios aunque el versículo esté desactivado', async () => {
    const { syncNotifications } = await import('./sync');
    const { AppDb } = await import('../db');
    const { DEFAULT_SETTINGS } = await import('../settings');
    const db = new AppDb('test-notify-routine');
    nativeFlag.v = true;
    plugin.schedule.mockReset();
    await db.routines.put(routine());
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
    plugin.getPending.mockResolvedValue({ notifications: [] });
    expect(await syncNotifications({ ...DEFAULT_SETTINGS, notifyEnabled: false, timeZone: 'America/Mexico_City' }, now, db)).toBe('scheduled');
    expect(plugin.schedule.mock.calls.at(-1)![0].notifications[0]).toMatchObject({ title: 'Buenos días ☀️', smallIcon: 'ic_stat_lux' });
  });
});

describe('mensaje de los avisos de rutina', () => {
  it('usa el mensaje propio si existe y, si no, uno de Lux distinto cada día', () => {
    const r = { title: 'Mañana', moment: 'morning' as const, items: ['prayer:x'], reminder: { enabled: true, time: '07:00', days: [1], message: '  Hora de hablar con Dios  ' } };
    expect(routineMessage(r).body).toBe('Hora de hablar con Dios');
    const sin = { ...r, reminder: { ...r.reminder, message: undefined } };
    expect(routineMessage(sin, 0).body).not.toBe(routineMessage(sin, 1).body);
  });
});
