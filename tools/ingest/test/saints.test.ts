import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Saint } from '@bc/shared';
import { buildSaintsPack, loadSaintRefs, loadSaints, runSaints, saintWarnings, validMonthDay, validateSaints, type SaintRefs } from '../src/saints';

const bio = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const saint = (id: string, extra: Partial<Saint> = {}): Saint => ({
  id, name: id, status: 'saint', categories: ['martyr'], summary: 's', biography: bio,
  celebrations: [{ date: '01-02', rank: 'memorial', calendar: 'general', title: 'T' }],
  sources: [{ label: 'Fuente', url: 'https://example.org/x' }], ...extra,
});
const refs = (): SaintRefs => ({ prayerIds: new Set(['p1']), novenaIds: new Set(['n1']), docIds: new Set(['doc.x']) });
const errs = (...s: Saint[]) => validateSaints(s, refs());

describe('validateSaints', () => {
  it('acepta un santo correcto', () => expect(errs(saint('a'))).toEqual([]));
  it('ids únicos y kebab-case', () => {
    expect(errs(saint('a'), saint('a'))).toContain('santo duplicado: a');
    expect(errs(saint('Santa_Ana'))[0]).toMatch(/kebab-case/);
  });
  it('fechas MM-DD válidas', () => {
    expect(validMonthDay('02-29')).toBe(true);
    expect(validMonthDay('02-30')).toBe(false);
    expect(validMonthDay('13-01')).toBe(false);
    expect(validMonthDay('1-5')).toBe(false);
    expect(errs(saint('a', { celebrations: [{ date: '04-31', rank: 'memorial', calendar: 'general', title: 'T' }] }))[0]).toMatch(/fecha no válida/);
  });
  it('exige sources', () => expect(errs(saint('a', { sources: [] }))).toContain('santo a: sources vacío'));
  it('exige biografía y categorías', () => {
    expect(errs(saint('a', { biography: 'corta' }))[0]).toMatch(/demasiado corta/);
    expect(errs(saint('a', { categories: [] }))).toContain('santo a: sin categorías');
  });
  it('comprueba referencias a oraciones, novenas y documentos', () => {
    expect(errs(saint('a', { prayers: ['p1'], novenas: ['n1'], works: [{ title: 'O', docId: 'doc.x' }] }))).toEqual([]);
    const e = errs(saint('a', { prayers: ['zz'], novenas: ['yy'], works: [{ title: 'O', docId: 'doc.no' }] })).join('|');
    expect(e).toMatch(/oración inexistente «zz»/);
    expect(e).toMatch(/novena inexistente «yy»/);
    expect(e).toMatch(/docId inexistente «doc.no»/);
  });
  it('rangos y colores válidos', () => {
    expect(errs(saint('a', { celebrations: [{ date: '01-02', rank: 'x' as never, calendar: 'general', title: 'T' }] }))[0]).toMatch(/rango/);
  });
  it('avisa de biografías fuera de 300-900 palabras', () => expect(saintWarnings([saint('a')])[0]).toMatch(/<300/));
});

describe('build y publicación', () => {
  it('ordena por id de forma determinista', () => {
    const p = buildSaintsPack([saint('b'), saint('a')], '2026.01.01');
    expect(p.saints.map((s) => s.id)).toEqual(['a', 'b']);
    expect(p.kind).toBe('saints');
    expect(JSON.stringify(buildSaintsPack([saint('a'), saint('b')], '2026.01.01'))).toBe(JSON.stringify(p));
  });
  it('lee, valida y publica en directorios temporales', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'saints-'));
    const dir = join(tmp, 'saints');
    mkdirSync(dir);
    writeFileSync(join(dir, '01.json'), JSON.stringify([saint('a')]));
    writeFileSync(join(dir, '02.json'), JSON.stringify([saint('b', { celebrations: [{ date: '02-02', rank: 'feast', calendar: 'mx', title: 'T' }] })]));
    expect(loadSaints(dir)).toHaveLength(2);
    const catalogFile = join(tmp, 'catalog.json');
    writeFileSync(catalogFile, JSON.stringify({ format: 1, name: 'x', updatedAt: '', packs: [] }));
    const r = runSaints({ dir, packsDir: join(tmp, 'packs'), webDir: join(tmp, 'web'), catalogFile });
    expect(r.pack.saints).toHaveLength(2);
    const pack = JSON.parse(gunzipSync(readFileSync(r.file)).toString('utf8'));
    expect(pack.kind).toBe('saints');
    expect(readFileSync(r.webCopy).equals(readFileSync(r.file))).toBe(true);
    const cat = JSON.parse(readFileSync(catalogFile, 'utf8'));
    expect(cat.packs.find((p: { id: string }) => p.id === 'saints.es').sha256).toBe(r.sha256);
  });
  it('rechaza fuentes inválidas', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'saints-'));
    mkdirSync(join(tmp, 's'));
    writeFileSync(join(tmp, 's', '01.json'), JSON.stringify([saint('a', { sources: [] })]));
    expect(() => runSaints({ dir: join(tmp, 's'), packsDir: join(tmp, 'p'), webDir: join(tmp, 'w'), catalogFile: join(tmp, 'c.json') })).toThrow(/sources vacío/);
  });
});

describe('datos reales del santoral', () => {
  it('son válidos contra las oraciones y el catálogo reales', () => {
    const saints = loadSaints();
    expect(saints.length).toBeGreaterThan(0);
    expect(validateSaints(saints, loadSaintRefs())).toEqual([]);
  });
});
