import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import type { FormationPack } from '@bc/shared';
import { checkLatinExercise, searchDict, compendioFor, findCcc, flatten, parseCccQuery, searchCcc, searchDocs } from './catalog';

const pack = JSON.parse(gunzipSync(readFileSync(join(__dirname, '../../../public/packs/formation.es.pack'))).toString('utf8')) as FormationPack;

describe('formación', () => {
  it('ccc:1324 → Eucaristía con enlace a vatican.va', () => {
    const h = findCcc(pack, 1324)!;
    expect(h.node.title).toMatch(/Eucarist/);
    expect(h.url).toMatch(/^https:\/\/www\.vatican\.va\/archive\/catechism_sp\/p2s2c1a3_sp\.html/);
    expect(h.path[0]!.label).toBe('Segunda parte');
  });
  it('cubre 1-2865', () => {
    for (const n of [1, 26, 1601, 2400, 2865]) expect(findCcc(pack, n)).not.toBeNull();
    expect(findCcc(pack, 2866)).toBeNull();
  });
  it('consulta por número y búsqueda', () => {
    expect(parseCccQuery('ccc:1324')).toBe(1324);
    expect(parseCccQuery('Eucaristía')).toBeNull();
    expect(searchCcc(pack, 'bautismo').length).toBeGreaterThan(0);
    expect(searchDocs(pack.documents, 'rerum novarum')[0]!.id).toBe('rerum-novarum');
  });
  it('compendio y conteos', () => {
    expect(pack.compendio.questions).toHaveLength(598);
    expect(compendioFor(pack, 1324).length).toBeGreaterThan(0);
    expect(pack.councils).toHaveLength(21);
    expect(pack.areas).toHaveLength(16);
    expect(pack.itineraries).toHaveLength(9);
    expect(flatten(pack.ccc.nodes).every((n) => n.from === undefined || n.summary)).toBe(true);
  });
  it('diccionario: búsqueda sin tildes y relaciones consistentes', () => {
    const d = pack.dictionary!;
    expect(d.length).toBeGreaterThanOrEqual(150);
    expect(searchDict(d, 'transubstanciacion')[0]!.id).toBe('transubstanciacion');
    expect(searchDict(d, 'HIPOSTASIS')[0]!.id).toBe('hipostasis');
    expect(searchDict(d, 'perijoresis').length).toBeGreaterThan(0);
    expect(searchDict(d, '', 'latin').every((e) => e.category === 'latin')).toBe(true);
    const ids = new Set(d.map((e) => e.id));
    expect(d.every((e) => e.related.every((r) => ids.has(r)))).toBe(true);
  });
  it('latín: lecciones y comprobación local', () => {
    const l = pack.latin!;
    expect(l.length).toBeGreaterThanOrEqual(8);
    const fill = l.flatMap((x) => x.exercises).find((x) => x.kind === 'fill')!;
    expect(checkLatinExercise(fill, fill.kind === 'fill' ? fill.answer : 0)).toBe(true);
    expect(checkLatinExercise(fill, 99)).toBe(false);
    const m = l.flatMap((x) => x.exercises).find((x) => x.kind === 'match')!;
    expect(checkLatinExercise(m, m.kind === 'match' ? m.pairs.map((_, i) => i) : [])).toBe(true);
  });
});
