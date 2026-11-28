// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings';
import { buildSaintCatalog } from '../saints/catalog';
import { sampleSaintsPack } from '@/test/saintsFixture';
import { buildLiturgicalPlan, LITURGICAL_ID_BASE, MAX_PER_DAY, novenaFeastDate, novenasStartingOn, type LiturgicalSettings, type NovenaRef } from './liturgical';
import { buildPlan, capPlan, MAX_PENDING, type NotifySettings, type PlannedNotification } from './plan';
import { makeSaintFor } from './sync';

const TZ = 'America/Mexico_City';
const on: LiturgicalSettings = { timeZone: TZ, calendar: 'mx', notifySaint: true, notifyCelebrations: true, notifySeasons: true, notifySeasonContent: true, notifyNovenas: true, notifyRosary: true };
const novenas: NovenaRef[] = [
  { id: 'guadalupe', title: 'Novena a Nuestra Señora de Guadalupe', feast: { month: 12, day: 12, label: 'Fiesta de Nuestra Señora de Guadalupe' } },
  { id: 'inmaculada-concepcion', title: 'Novena a la Inmaculada Concepción', feast: { month: 12, day: 8, label: 'Solemnidad de la Inmaculada Concepción de la Virgen María' } },
  { id: 'sagrado-corazon', title: 'Novena al Sagrado Corazón' },
  { id: 'espiritu-santo', title: 'Novena al Espíritu Santo' },
  { id: 'divina-misericordia', title: 'Novena a la Divina Misericordia' },
  { id: 'cristo-rey', title: 'Novena a Cristo Rey' },
];
const cat = buildSaintCatalog([sampleSaintsPack()]);
const saintFor = makeSaintFor({ calendar: 'mx' }, cat);
const at = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00-06:00`).toISOString();
const localDay = (p: PlannedNotification) => p.at.toLocaleDateString('en-CA', { timeZone: TZ });
const byDay = (plan: PlannedNotification[]) => {
  const m = new Map<string, PlannedNotification[]>();
  for (const p of plan) m.set(localDay(p), [...(m.get(localDay(p)) ?? []), p]);
  return m;
};

describe('fechas de novenas desde el calendario', () => {
  const o = { calendar: 'mx' };
  it('fiestas fijas y móviles 2026-2028', () => {
    expect(novenaFeastDate(novenas[0]!, 2026, o)).toBe('2026-12-12');
    expect(novenaFeastDate(novenas[2]!, 2026, o)).toBe('2026-06-12'); // Sagrado Corazón
    expect(novenaFeastDate(novenas[2]!, 2027, o)).toBe('2027-06-04');
    expect(novenaFeastDate(novenas[2]!, 2028, o)).toBe('2028-06-23');
    expect(novenaFeastDate(novenas[3]!, 2026, o)).toBe('2026-05-24'); // Pentecostés
    expect(novenaFeastDate(novenas[3]!, 2027, o)).toBe('2027-05-16');
    expect(novenaFeastDate(novenas[4]!, 2026, o)).toBe('2026-04-12'); // Domingo de la Misericordia
    expect(novenaFeastDate(novenas[5]!, 2026, o)).toBe('2026-11-22');
    expect(novenaFeastDate({ id: 'x', title: 'x' }, 2026, o)).toBeNull();
  });
  it('empiezan nueve días antes', () => {
    const ids = (d: string) => novenasStartingOn(d, novenas, o).map((n) => n.id);
    expect(ids('2026-12-03')).toEqual(['guadalupe']);
    expect(ids('2026-11-29')).toEqual(['inmaculada-concepcion']);
    expect(ids('2026-06-03')).toEqual(['sagrado-corazon']);
    expect(ids('2026-05-15')).toEqual(['espiritu-santo']);
    expect(ids('2026-04-03')).toEqual(['divina-misericordia']); // Viernes Santo
    expect(ids('2026-11-13')).toEqual(['cristo-rey']);
    expect(ids('2026-12-04')).toEqual([]);
  });
});

describe('plan litúrgico', () => {
  const now = new Date('2026-12-01T12:00:00Z'); // 06:00 en México
  it('desactivado: nada', async () => {
    expect(await buildLiturgicalPlan({ now, settings: { timeZone: TZ } })).toEqual([]);
  });
  it('cada categoría por separado, con su hora y generada del calendario', async () => {
    const one = async (k: keyof LiturgicalSettings, time: Partial<LiturgicalSettings>, days = 14) => buildLiturgicalPlan({ now, days, settings: { timeZone: TZ, calendar: 'mx', [k]: true, ...time } as LiturgicalSettings, saintFor, novenas });
    const sa = await one('notifySaint', { notifySaintTime: '07:30' });
    expect(sa.map((p) => p.kind)).toEqual(['saint', 'saint']); // 9 dic Juan Diego y 12 dic Guadalupe
    expect(sa[0]!.title).toBe('Hoy celebramos a San Juan Diego Cuauhtlatoatzin 🕯️');
    expect(sa[0]!.at.toISOString()).toBe(at('2026-12-09', '07:30'));
    expect(sa[0]!.path).toBe('/santo/?id=juan-diego&from=/');
    expect(sa[1]!.title).toBe('Hoy celebramos a Nuestra Señora de Guadalupe 🕯️');
    expect(sa[1]!.at.toISOString()).toBe(at('2026-12-12', '07:30'));
    const ce = await one('notifyCelebrations', { notifyCelebrationsTime: '08:00' });
    expect(ce.map((p) => [p.at.toISOString(), p.title])).toEqual([
      [at('2026-12-08', '08:00'), 'Inmaculada Concepción de la Virgen María ⛪'],
      [at('2026-12-12', '08:00'), 'Nuestra Señora de Guadalupe, patrona de México ⛪'],
    ]);
    const nv = await one('notifyNovenas', { notifyNovenasTime: '09:00' }, 30);
    expect(nv.map((p) => [p.at.toISOString(), p.path])).toEqual([[at('2026-12-03', '09:00'), '/novena/?id=guadalupe']]);
    const ro = await one('notifyRosary', { notifyRosaryTime: '19:00' }, 3);
    // 1 dic 2026 es martes; las 19:00 locales del 1 dic ya pasaron? no: son las 06:00, así que 1, 2 y 3 dic
    expect(ro.map((p) => p.body)).toEqual(['Hoy meditamos los misterios dolorosos. ¿Te unes?', 'Hoy meditamos los misterios gloriosos. ¿Te unes?', 'Hoy meditamos los misterios luminosos. ¿Te unes?']);
  });
  it('máximo 2 por día, por prioridad', async () => {
    const plan = await buildLiturgicalPlan({ now, days: 28, settings: { ...on }, saintFor, novenas });
    for (const [day, list] of byDay(plan)) expect(list.length, day).toBeLessThanOrEqual(MAX_PER_DAY);
    // 8 dic: celebración (prioridad 2) y Rosario (4) desplazan al santo (5)
    const d8 = plan.filter((p) => localDay(p) === '2026-12-08');
    expect(d8.map((p) => p.kind).sort()).toEqual(['celebration', 'rosary']);
    // 12 dic: celebración + Rosario
    expect(plan.filter((p) => localDay(p) === '2026-12-12').map((p) => p.kind).sort()).toEqual(['celebration', 'rosary']);
  });
  it('inicio de tiempos (Adviento 2026 y Navidad) y contenido semanal', async () => {
    const adv = await buildLiturgicalPlan({ now: new Date('2026-11-27T12:00:00Z'), days: 5, settings: { timeZone: TZ, calendar: 'mx', notifySeasons: true } });
    expect(adv.some((p) => p.title === 'Comienza el Adviento' && p.at.toISOString() === at('2026-11-29', '08:00'))).toBe(true);
    const xmas = await buildLiturgicalPlan({ now: new Date('2026-12-20T12:00:00Z'), days: 7, settings: { timeZone: TZ, calendar: 'mx', notifySeasons: true } });
    expect(xmas.find((p) => p.title === 'Feliz Navidad')?.at.toISOString()).toBe(at('2026-12-25', '08:00'));
    const content = await buildLiturgicalPlan({ now: new Date('2026-12-01T12:00:00Z'), days: 21, settings: { timeZone: TZ, calendar: 'mx', notifySeasonContent: true } });
    expect(content.every((p) => p.kind === 'content')).toBe(true);
    expect(content.map((p) => p.at.toISOString().slice(0, 10))).toEqual(['2026-12-06', '2026-12-13', '2026-12-20']); // cada 7 días desde el inicio (domingos), solo en temporadas largas
  });
  it('omite lo que ya pasó, usa la zona horaria y no repite ids', async () => {
    const plan = await buildLiturgicalPlan({ now: new Date('2026-12-08T15:00:00Z'), days: 10, settings: { ...on }, saintFor, novenas });
    expect(plan.every((p) => p.at > new Date('2026-12-08T15:00:00Z'))).toBe(true);
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
    expect(plan.every((p) => p.id >= LITURGICAL_ID_BASE)).toBe(true);
    const gen = await buildLiturgicalPlan({ now, days: 14, settings: { timeZone: TZ, calendar: 'general', notifyCelebrations: true } });
    expect(gen.some((p) => p.title.startsWith('Nuestra Señora de Guadalupe'))).toBe(false); // memoria libre: no es celebración mayor
  });
  it('calendario general no avisa del propio de México', async () => {
    const s = makeSaintFor({ calendar: 'general' }, cat);
    expect((await s('2026-12-09'))?.body).toMatch(/Memoria libre/);
    expect((await makeSaintFor({ calendar: 'mx' }, cat)('2026-12-09'))?.body).toMatch(/Memoria obligatoria/);
    expect(await makeSaintFor({ calendar: 'mx' }, null)('2026-12-09')).toBeNull();
    expect(await makeSaintFor({ calendar: 'mx' }, cat)('2027-12-12')).toBeNull(); // Guadalupe trasladada: no se celebra el domingo
  });
});

describe('tope de notificaciones pendientes', () => {
  const settings: NotifySettings = { ...DEFAULT_SETTINGS, ...on, timeZone: TZ, notifyEnabled: true, notifyReading: true, notifyPrayer: true };
  const verseFor = async (iso: string) => ({ title: iso, body: 'x' });
  it('nunca supera MAX_PENDING y conserva las del usuario', async () => {
    const plan = await buildPlan({ now: new Date('2026-12-01T12:00:00Z'), settings, verseFor, saintFor, novenas });
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING);
    expect(plan.filter((p) => ['verse', 'reading', 'prayer'].includes(p.kind))).toHaveLength(21);
    expect(plan.map((p) => p.at.getTime())).toEqual([...plan.map((p) => p.at.getTime())].sort((a, b) => a - b));
  });
  it('recorte: las del usuario ceden solo si ellas solas superan el tope; de las litúrgicas se conservan las más próximas', () => {
    const mk = (id: number, kind: PlannedNotification['kind'], day: number): PlannedNotification => ({ id, kind, at: new Date(Date.UTC(2026, 11, day)), title: 't', body: 'b', path: '/' });
    const plan = [mk(1, 'saint', 1), mk(2, 'verse', 2), mk(3, 'saint', 3), mk(4, 'verse', 4), mk(5, 'rosary', 5)];
    expect(capPlan(plan, 4).map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(capPlan(plan, 3).map((p) => p.id)).toEqual([1, 2, 4]);
    expect(capPlan(plan, 10)).toHaveLength(5);
  });
  it('con las categorías desactivadas el plan es el de siempre', async () => {
    const plan = await buildPlan({ now: new Date('2026-12-01T12:00:00Z'), settings: { ...DEFAULT_SETTINGS, notifyEnabled: true, timeZone: TZ }, verseFor });
    expect(plan).toHaveLength(7);
  });
});
