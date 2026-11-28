import { describe, expect, it } from 'vitest';
import { readCatalog } from '../src/catalog';
import { loadFormationSources, validateFormation } from '../src/formation';

describe('formación', () => {
  it('las fuentes validan (CEC 1-2865, 598 preguntas, referencias, URLs)', () => {
    const s = loadFormationSources();
    const docIds = new Set(readCatalog().packs.filter((x) => x.id.startsWith('doc.')).map((x) => x.id));
    expect(validateFormation(s, docIds)).toEqual([]);
  });
  it('detecta un hueco en el Catecismo', () => {
    const s = loadFormationSources();
    s.ccc.nodes[0]!.to = 20;
    expect(validateFormation(s, new Set()).some((e) => e.includes('CEC'))).toBe(true);
  });
  const docIdsOf = () => new Set(readCatalog().packs.filter((x) => x.id.startsWith('doc.')).map((x) => x.id));
  it('diccionario: 150-250 entradas, sin errores, y detecta CEC/relaciones/ids inválidos', () => {
    const s = loadFormationSources();
    expect(s.dictionary.length).toBeGreaterThanOrEqual(150);
    expect(s.dictionary.length).toBeLessThanOrEqual(250);
    s.dictionary[0]!.ccc = [2866];
    s.dictionary[1]!.related = ['no-existe'];
    s.dictionary[2]!.id = s.dictionary[3]!.id;
    const errs = validateFormation(s, docIdsOf());
    expect(errs.some((e) => e.includes('número CEC 2866'))).toBe(true);
    expect(errs.some((e) => e.includes('relación inexistente'))).toBe(true);
    expect(errs.some((e) => e.includes('id duplicado'))).toBe(true);
  });
  it('latín: 8-12 lecciones, clips preparados y texto latino coherente con el devocionario', () => {
    const s = loadFormationSources();
    expect(s.latin.length).toBeGreaterThanOrEqual(8);
    expect(s.latin.every((l) => l.texts.every((t) => t.clip.startsWith('latin/')))).toBe(true);
    s.latin[4]!.texts[0]!.lines[0]!.words[0] = ['Inventum', 'x'];
    s.latin[5]!.exercises.push({ kind: 'choose', prompt: 'p', options: ['a', 'b'], answer: 5 });
    const errs = validateFormation(s, docIdsOf());
    expect(errs.some((e) => e.includes('Inventum'))).toBe(true);
    expect(errs.some((e) => e.includes('respuesta fuera'))).toBe(true);
  });
});
