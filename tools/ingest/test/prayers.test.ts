import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { assertPack, type Novena, type Prayer } from '@bc/shared';
import { buildPrayersPack, loadPrayerSources, runPrayers, splitReferences, validatePrayers, type PrayerSources } from '../src/prayers';

const prayer = (id: string, extra: Partial<Prayer> = {}): Prayer => ({ id, title: id, categories: ['c'], nature: 'prayer', text: 'Texto. Amén.', ...extra });
const novena = (id: string, days = 2): Novena => ({
  id, title: id, group: 'other', description: 'd', introduction: 'i', purpose: 'p', nature: 'popular_piety',
  opening: [{ prayer: 'a' }], closing: [{ text: 'Fin' }],
  days: Array.from({ length: days }, (_, i) => ({ day: i + 1, reflection: 'r', prayer: 'o', reading: 'Lc 1,26-38' })),
});
const rosary = () => ({
  sets: [
    { set: 'joyful', title: 'G', weekdays: [1, 6], description: 'd' },
    { set: 'luminous', title: 'L', weekdays: [4], description: 'd' },
    { set: 'sorrowful', title: 'D', weekdays: [2, 5], description: 'd' },
    { set: 'glorious', title: 'Gl', weekdays: [3, 0], description: 'd' },
  ],
  mysteries: ['joyful', 'luminous', 'sorrowful', 'glorious'].flatMap((set) => [1, 2, 3, 4, 5].map((n) => ({ set, n, title: `${set}${n}`, ref: 'Lc 1,26-38', reflection: 'r', teaching: 't' }))),
  extras: [{ id: 'fatima', title: 'F', place: 'after_decade', prayer: 'a', defaultOn: true }],
  introduction: 'Intro',
}) as unknown as PrayerSources['rosary'];
const base = (): PrayerSources => ({
  categories: [{ id: 'c', title: 'C', icon: 'cross', order: 1 }],
  prayers: [prayer('a'), prayer('b')],
  novenas: [novena('n')],
  rosary: rosary(),
  routines: [{ id: 'r', title: 'R', moment: 'morning', items: ['prayer:a', 'novena:n', 'rosary', 'gospel', 'verse'] }],
});
const errs = (mut: (s: PrayerSources) => void) => { const s = base(); mut(s); return validatePrayers(s); };

describe('validatePrayers', () => {
  it('acepta unas fuentes correctas', () => expect(validatePrayers(base())).toEqual([]));
  it('exige ids únicos y kebab-case', () => {
    expect(errs((s) => s.prayers.push(prayer('a')))).toContain('oración duplicada: a');
    expect(errs((s) => s.prayers.push(prayer('Ave_María')))[0]).toMatch(/kebab-case/);
  });
  it('exige categorías existentes, naturaleza válida y texto no vacío', () => {
    expect(errs((s) => (s.prayers[0]!.categories = ['x']))[0]).toMatch(/categoría inexistente/);
    expect(errs((s) => ((s.prayers[0] as { nature: string }).nature = 'otra'))[0]).toMatch(/nature/);
    expect(errs((s) => (s.prayers[0]!.text = '  '))[0]).toMatch(/texto vacío/);
  });
  it('valida iconos de categoría', () => expect(errs((s) => (s.categories[0]!.icon = 'xx'))[0]).toMatch(/icono/));
  it('valida variantes (nota de origen obligatoria)', () => {
    expect(errs((s) => (s.prayers[0]!.variants = [{ id: 'v', label: 'V', text: 't' }]))[0]).toMatch(/sin nota/);
  });
  it('valida referencias bíblicas', () => {
    expect(errs((s) => (s.prayers[0]!.scripture = ['Lc 1,26-38', 'Zz 3,4']))[0]).toMatch(/no analizable/);
  });
  it('valida rutinas (oraciones y novenas existentes)', () => {
    expect(errs((s) => s.routines[0]!.items.push('prayer:nope'))[0]).toMatch(/oración inexistente/);
    expect(errs((s) => s.routines[0]!.items.push('novena:nope'))[0]).toMatch(/novena inexistente/);
    expect(errs((s) => s.routines[0]!.items.push('otra-cosa'))[0]).toMatch(/no válido/);
  });
  it('valida pasos de novena y días consecutivos', () => {
    expect(errs((s) => (s.novenas[0]!.opening = [{ prayer: 'nope' }]))[0]).toMatch(/oración inexistente/);
    expect(errs((s) => (s.novenas[0]!.days[1]!.day = 3))[0]).toMatch(/consecutivos/);
    expect(errs((s) => (s.novenas[0]!.days = []))[0]).toMatch(/sin días/);
    expect(errs((s) => (s.novenas[0]!.days[0]!.reading = 'Xx 1,1'))[0]).toMatch(/no analizable/);
  });
  it('valida el Rosario: 20 misterios, n 1-5 y extras existentes', () => {
    expect(errs((s) => s.rosary!.mysteries.pop()).join()).toMatch(/20 misterios/);
    expect(errs((s) => (s.rosary!.mysteries[0]!.n = 2)).join()).toMatch(/n=1\.\.5/);
    expect(errs((s) => (s.rosary!.extras[0]!.prayer = 'nope'))[0]).toMatch(/oración inexistente/);
    expect(errs((s) => (s.rosary = undefined))[0]).toMatch(/falta rosary/);
    expect(errs((s) => (s.rosary!.sets[0]!.weekdays = [1]))[0]).toMatch(/días de la semana/);
  });
});

describe('splitReferences', () => {
  it('descompone referencias compuestas', () => {
    expect(splitReferences('Mt 6,28-30; Cant 2,10-13')).toEqual(['Mt 6,28-30', 'Cant 2,10-13']);
    expect(splitReferences('Lc 2,19.51')).toEqual(['Lc 2,19', 'Lc 2,51']);
    expect(splitReferences('Ap 1,4-8; 22,12-13')).toEqual(['Ap 1,4-8', 'Ap 22,12-13']);
    expect(splitReferences('Jds 1,3-4.17-19')).toEqual(['Jds 1,3-4', 'Jds 1,17-19']);
  });
});

describe('tolerancia y determinismo', () => {
  it('tolera que no exista la carpeta novenas/', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prayers-'));
    mkdirSync(join(dir, 'prayers'));
    writeFileSync(join(dir, 'prayers', 'x.json'), JSON.stringify([prayer('a')]));
    writeFileSync(join(dir, 'categories.json'), JSON.stringify(base().categories));
    const src = loadPrayerSources(dir);
    expect(src.novenas).toEqual([]);
    expect(src.prayers).toHaveLength(1);
  });
  it('ordena de forma determinista', () => {
    const a = base();
    const b = base();
    b.prayers.reverse();
    expect(JSON.stringify(buildPrayersPack(a))).toBe(JSON.stringify(buildPrayersPack(b)));
  });
});

describe('fuentes reales', () => {
  it('son válidas y el paquete resultante pasa assertPack', () => {
    const src = loadPrayerSources();
    expect(validatePrayers(src)).toEqual([]);
    const pack = buildPrayersPack(src);
    assertPack(pack);
    expect(pack.rosary!.mysteries).toHaveLength(20);
    for (const id of ['padre-nuestro', 'ave-maria', 'angelus', 'coronilla-divina-misericordia', 'completas']) {
      expect(pack.prayers.some((p) => p.id === id)).toBe(true);
    }
  });
  it('runPrayers escribe un paquete reproducible y copia el archivo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prayers-out-'));
    const opts = { packsDir: join(dir, 'packs'), webDir: join(dir, 'web'), catalogFile: join(dir, 'catalog.json') };
    const r1 = runPrayers(opts);
    const r2 = runPrayers(opts);
    expect(r1.sha256).toBe(r2.sha256);
    expect(readFileSync(r1.webCopy).equals(readFileSync(r1.file))).toBe(true);
    const cat = JSON.parse(readFileSync(opts.catalogFile, 'utf8'));
    expect(cat.packs.filter((p: { id: string }) => p.id === 'prayers.es')).toHaveLength(1);
    expect(JSON.parse(gunzipSync(readFileSync(r1.file)).toString()).kind).toBe('prayers');
  });
});
