import { escapeLike, buildByBookQuery, buildHitsQuery, matchCondition, SearchParams, FUZZY_THRESHOLD } from './search.query';

const base: SearchParams = { q: 'amor', mode: 'words', versionIds: null, page: 1, pageSize: 25 };
const MALICIOSA = `'; DROP TABLE "User"; --`;

describe('construcción de la consulta de búsqueda', () => {
  it('nunca interpola el texto del usuario en el SQL (solo como parámetro)', () => {
    for (const mode of ['words', 'exact', 'fuzzy'] as const) {
      for (const build of [buildHitsQuery, buildByBookQuery]) {
        const s = build({ ...base, mode, q: MALICIOSA, versionIds: ["x'y"], testament: 'NT', bookId: 43 });
        expect(s.sql).not.toContain('DROP TABLE');
        expect(s.sql).not.toContain("x'y");
        expect(s.values.some((v) => typeof v === 'string' && v.includes('DROP TABLE'))).toBe(true);
      }
    }
  });

  it('words usa websearch_to_tsquery con la config de cada versión', () => {
    const s = matchCondition('words', 'amor');
    expect(s.text).toContain('websearch_to_tsquery(v."tsConfig"::regconfig, $1)');
    expect(s.values).toEqual(['amor']);
  });

  it('exact combina phraseto_tsquery con LIKE escapado', () => {
    const s = matchCondition('exact', '100%_x\\');
    expect(s.sql).toContain('phraseto_tsquery');
    expect(s.sql).toContain('LIKE');
    expect(s.values).toContain('%100\\%\\_x\\\\%');
  });

  it('fuzzy usa word_similarity con umbral', () => {
    const s = matchCondition('fuzzy', 'caridad');
    expect(s.sql).toContain('word_similarity');
    expect(s.values).toContain(FUZZY_THRESHOLD);
  });

  it('escapeLike escapa comodines', () => {
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });

  it('el snippet escapa HTML en SQL antes de ts_headline y las marcas viajan como parámetro', () => {
    const s = buildHitsQuery(base);
    const iEsc = s.sql.indexOf("'&amp;'");
    const iHead = s.sql.indexOf('ts_headline');
    expect(iEsc).toBeGreaterThan(-1);
    expect(s.sql).toContain("'&lt;'");
    expect(s.sql).toContain("'&gt;'");
    expect(s.sql).toContain('h.esc');
    expect(iHead).toBeGreaterThan(-1);
    expect(s.values).toContain('StartSel=<mark>, StopSel=</mark>, MaxFragments=0, MaxWords=60, MinWords=25');
  });

  it('aplica filtros y paginación', () => {
    const s = buildHitsQuery({ ...base, page: 3, pageSize: 10, testament: 'OT', bookId: 1, versionIds: ['a', 'b'] });
    expect(s.text).toContain('IN ($');
    expect(s.sql).toMatch(/"Testament"/);
    expect(s.values).toEqual(expect.arrayContaining([10, 20, 'OT', 1, 'a', 'b']));
  });
});
