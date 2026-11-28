import { describe, expect, it } from 'vitest';
import type { Catalog, CatalogEntry, Novena, Prayer, Saint } from '@bc/shared';
import type { PrayerSources } from '../src/prayers';
import {
  checkArtBookKeys,
  checkCatalog,
  checkPrayerContent,
  checkSaints,
  declaredNovenaDays,
  extractArtBookKeys,
  extractSaints,
  formatContentReport,
  isValidMmDd,
  type PackFileInfo,
} from '../src/integrity';

const prayer = (id: string, extra: Partial<Prayer> = {}): Prayer => ({
  id, title: id, categories: ['c'], nature: 'prayer', text: 'Texto. Amén.', sources: [{ label: 'Fuente' }], ...extra,
});
const novena = (id: string, extra: Partial<Novena> = {}, days = 2): Novena => ({
  id, title: id, group: 'other', description: 'Descripción', introduction: 'i', purpose: 'p', nature: 'popular_piety',
  opening: [{ prayer: 'a' }], closing: [{ text: 'Fin' }],
  days: Array.from({ length: days }, (_, i) => ({ day: i + 1, reflection: 'r', prayer: 'o' })),
  ...extra,
});
const rosary = () => ({
  sets: [
    { set: 'joyful', title: 'G', weekdays: [1, 6], description: 'd' },
    { set: 'luminous', title: 'L', weekdays: [4], description: 'd' },
    { set: 'sorrowful', title: 'D', weekdays: [2, 5], description: 'd' },
    { set: 'glorious', title: 'Gl', weekdays: [3, 0], description: 'd' },
  ],
  mysteries: ['joyful', 'luminous', 'sorrowful', 'glorious'].flatMap((set) =>
    [1, 2, 3, 4, 5].map((n) => ({ set, n, title: `${set}${n}`, ref: 'Lc 1,26-38', reflection: 'r', teaching: 't' })),
  ),
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
const withMut = (mut: (s: PrayerSources) => void) => {
  const s = base();
  mut(s);
  return checkPrayerContent(s);
};

describe('isValidMmDd', () => {
  it('acepta fechas reales, incluido 02-29', () => {
    expect(isValidMmDd('02-29')).toBe(true);
    expect(isValidMmDd('12-31')).toBe(true);
    expect(isValidMmDd('04-30')).toBe(true);
  });
  it('rechaza fechas imposibles y formatos incorrectos', () => {
    expect(isValidMmDd('02-30')).toBe(false);
    expect(isValidMmDd('04-31')).toBe(false);
    expect(isValidMmDd('13-01')).toBe(false);
    expect(isValidMmDd('00-10')).toBe(false);
    expect(isValidMmDd('1-5')).toBe(false);
    expect(isValidMmDd('2026-02-01')).toBe(false);
    expect(isValidMmDd(undefined)).toBe(false);
  });
});

describe('checkPrayerContent', () => {
  it('acepta unas fuentes correctas', () => {
    expect(checkPrayerContent(base())).toEqual({ errors: [], warnings: [] });
  });
  it('marca ids duplicados (reutiliza validatePrayers)', () => {
    expect(withMut((s) => s.prayers.push(prayer('a'))).errors).toContain('oración duplicada: a');
  });
  it('marca rutinas con elementos inexistentes', () => {
    const r = withMut((s) => (s.routines[0]!.items = ['prayer:fantasma', 'novena:nada']));
    expect(r.errors.join('\n')).toMatch(/oración inexistente «fantasma»/);
    expect(r.errors.join('\n')).toMatch(/novena inexistente «nada»/);
  });
  it('marca oraciones con categorías inexistentes', () => {
    expect(withMut((s) => s.prayers.push(prayer('x', { categories: ['no-existe'] }))).errors.join()).toMatch(/categoría inexistente/);
  });
  it('exige fuentes en toda oración no original', () => {
    const r = withMut((s) => s.prayers.push(prayer('sin-fuente', { sources: undefined, nature: 'saint' })));
    expect(r.errors).toContain('oración sin-fuente: nature «saint» sin ninguna fuente en sources');
  });
  it('no exige fuentes a las oraciones originales', () => {
    expect(withMut((s) => s.prayers.push(prayer('propia', { nature: 'original', sources: undefined, attribution: 'Composición de Lux' }))).errors).toEqual([]);
  });
  it('rechaza oraciones originales con atribución de autoría tradicional', () => {
    const r = withMut((s) => s.prayers.push(prayer('falsa', { nature: 'original', attribution: 'San Francisco de Asís' })));
    expect(r.errors.join()).toMatch(/nature «original» con atribución que sugiere autoría tradicional/);
    const r2 = withMut((s) => s.prayers.push(prayer('falsa2', { nature: 'original', attribution: 'Atribuida a León XIII' })));
    expect(r2.errors.join()).toMatch(/autoría tradicional/);
  });
  it('detecta días duplicados y número de días distinto del declarado', () => {
    const dup = withMut((s) => (s.novenas = [novena('d', {}, 0)]));
    expect(dup.errors.join()).toMatch(/sin días/);
    const dupDays = withMut((s) => {
      const n = novena('d', {}, 3);
      n.days[2]!.day = 2; // dos días con número 2
      s.novenas = [n];
    });
    expect(dupDays.errors.join()).toMatch(/días duplicados|consecutivos/);
    const declared = withMut((s) => (s.novenas = [novena('e', { title: 'Novena de nueve días' }, 3)]));
    expect(declared.errors.join()).toMatch(/declara 9 días en el texto y tiene 3/);
  });
});

describe('declaredNovenaDays', () => {
  it('lee cifras y palabras numéricas', () => {
    expect(declaredNovenaDays({ title: 'Novena', description: 'Nueve días de oración' })).toEqual([9]);
    expect(declaredNovenaDays({ title: '9 días', description: 'nueve días' })).toEqual([9]);
    expect(declaredNovenaDays({ title: 'Novena', description: 'Oración diaria' })).toEqual([]);
  });
});

const saint = (id: string, extra: Partial<Saint> = {}): Saint => ({
  id, name: id, status: 'saint', celebrations: [{ date: '02-29', rank: 'memorial', calendar: 'general', title: id }],
  categories: ['pastor'], summary: 's', biography: 'b', sources: [{ label: 'Martirologio' }], ...extra,
});

describe('checkSaints', () => {
  const known = { prayers: new Set(['a']), novenas: new Set(['n']) };
  it('acepta santos correctos (02-29 válida)', () => {
    expect(checkSaints([{ file: 's.json', saints: [saint('x')] }], known)).toEqual({ errors: [], warnings: [] });
  });
  it('marca ids duplicados entre archivos', () => {
    const r = checkSaints([{ file: 'a.json', saints: [saint('x')] }, { file: 'b.json', saints: [saint('x')] }], known);
    expect(r.errors).toContain('b.json santo x: id duplicado');
  });
  it('marca fechas imposibles y sin fuentes', () => {
    const r = checkSaints([{ file: 's.json', saints: [saint('y', { sources: [], celebrations: [{ date: '02-30', rank: 'memorial', calendar: 'general', title: 'y' }] })] }], known);
    expect(r.errors.join('\n')).toMatch(/fecha de celebración no válida «02-30»/);
    expect(r.errors.join('\n')).toMatch(/sin fuentes/);
  });
  it('marca referencias a oraciones y novenas inexistentes', () => {
    const r = checkSaints([{ file: 's.json', saints: [saint('z', { prayers: ['a', 'falta'], novenas: ['nope'] })] }], known);
    expect(r.errors).toContain('s.json santo z: oración inexistente «falta»');
    expect(r.errors).toContain('s.json santo z: novena inexistente «nope»');
  });
});

describe('extractSaints', () => {
  it('acepta pack, lista o santo suelto', () => {
    expect(extractSaints({ kind: 'saints', saints: [saint('a')] })).toHaveLength(1);
    expect(extractSaints([saint('a'), saint('b')])).toHaveLength(2);
    expect(extractSaints(saint('a'))).toHaveLength(1);
    expect(extractSaints({})).toEqual([]);
  });
});

const entry = (id: string, url: string, extra: Partial<CatalogEntry> = {}): CatalogEntry =>
  ({ id, kind: 'document', version: '1', title: id, language: 'es', url, bytes: 10, sha256: 'abc', authority: 'devotional', source: { name: 'n', license: 'CC0', provenanceUrl: 'x', retrievedAt: 'x' }, ...extra }) as CatalogEntry;
const catalog = (packs: CatalogEntry[]): Pick<Catalog, 'packs'> => ({ packs });
const files: Record<string, PackFileInfo> = { 'packs/a.json.gz': { bytes: 10, sha256: 'abc' } };
const lookup = (url: string) => files[url] ?? null;

describe('checkCatalog', () => {
  it('acepta entradas con bytes y sha256 coincidentes', () => {
    expect(checkCatalog(catalog([entry('a', 'packs/a.json.gz')]), lookup)).toEqual({ errors: [], warnings: [] });
  });
  it('marca ids duplicados, urls inexistentes y hashes o tamaños distintos', () => {
    const r = checkCatalog(
      catalog([entry('a', 'packs/a.json.gz'), entry('a', 'packs/a.json.gz'), entry('b', 'packs/falta.json.gz'), entry('c', 'packs/a.json.gz', { bytes: 11, sha256: 'zzz' })]),
      lookup,
    );
    expect(r.errors).toContain('entrada a: id duplicado');
    expect(r.errors).toContain('entrada b: la url «packs/falta.json.gz» no apunta a un archivo existente en content/');
    expect(r.errors.join('\n')).toMatch(/entrada c: bytes 11 en el catálogo, 10 en el archivo/);
    expect(r.errors.join('\n')).toMatch(/entrada c: sha256 del catálogo no coincide/);
  });
});

describe('arte: claves book:<id>', () => {
  it('extrae claves book únicas del código fuente', () => {
    const src = '"keys": [\n "book:bible.BLL"\n], "keys": ["book:bible.BLL", "art:x", "book:doc.azul"]';
    expect(extractArtBookKeys(src)).toEqual(['bible.BLL', 'doc.azul']);
  });
  it('avisa (sin error) de claves sin paquete en el catálogo', () => {
    const r = checkArtBookKeys(['bible.BLL', 'doc.fantasma'], new Set(['bible.BLL']));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual(['clave «book:doc.fantasma» sin paquete en content/catalog.json']);
  });
  it('no avisa de las claves genéricas de respaldo book:bible y book:doc', () => {
    expect(checkArtBookKeys(['bible', 'doc'], new Set()).warnings).toEqual([]);
  });
});

describe('formatContentReport', () => {
  it('muestra errores, avisos y resultado', () => {
    const txt = formatContentReport({ errors: ['x: roto'], warnings: ['y: aviso'], notes: [], counts: { prayers: 1, novenas: 0, categories: 0, routines: 0, saints: 0, catalogEntries: 0 } });
    expect(txt).toMatch(/Errores \(1\):\n {2}- x: roto/);
    expect(txt).toMatch(/Avisos \(1\)/);
    expect(txt).toMatch(/Resultado: 1 error/);
  });
});
