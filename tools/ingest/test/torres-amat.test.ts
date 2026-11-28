import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { CANON } from '@bc/shared';
import { PACKS_DIR } from '../src/paths';
import { applyFixes, cleanVerse, cleanWikitext, parseTa } from '../src/torres-amat/parse';

const page = (offset: number, wikitext: string, level = 3) => ({ offset, level, wikitext });

describe('Torres Amat: limpieza del wikitexto', () => {
  it('quita notas, cabeceras, números de página y guiones de fin de página', () => {
    const pages = {
      XIII: [
        page(28, '<noinclude><pagequality level="3" />{{CP|1|SAN MATHEO.|}}</noinclude>{{c|CAPÍTULO I.}}\n{{sc|Sumario.}}\n\n{{vers|1|1}} Genealogía <ref>Nota.</ref> de Jesu-Christo, hijo de David, y de {{guion|Abra-|Abraham}}<noinclude>{{línea}}</noinclude>'),
        page(29, '<noinclude><pagequality level="3" />{{CP|2||}}</noinclude>{{guion|ham|}}. Fin.\n\n{{vers|1|2}} Abraham engendró á Isaac.{{np}}<noinclude></noinclude>'),
      ],
    };
    const r = parseTa(pages);
    expect(r.bible.books.Matt!['1']).toEqual([[1, 'Genealogía de Jesu-Christo, hijo de David, y de Abraham. Fin.'], [2, 'Abraham engendró á Isaac.']]);
  });
  it('trata erratas de numeración de la transcripción', () => {
    const w = '{{vers|1|1}} Uno.\n\n{{vers|1|}} Dos.\n\n{{vers|s|3}} Tres.\n\n{{vers|1|9}} Cuatro.\n\n{{vers|1|5}} Cinco.\n\n6 Seis.\n\n— 7 Siete.';
    const r = parseTa({ XIII: [page(28, w)] });
    expect(r.bible.books.Matt!['1']!.map(([n]) => n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('cleanVerse/applyFixes', () => {
    expect(cleanVerse("''Hola'' {{may|Jesus}} , dijo ; «x»")).toBe('Hola Jesus, dijo; «x»');
    expect(applyFixes('di- ciendo asl nosostros')).toBe('diciendo así nosotros');
    expect(cleanWikitext('a<ref>x</ref>b{{corr|mal|bien}}')).toBe('abbien');
  });
});

// ---- Control de calidad del paquete publicado (bible.TA) ----
const pack = JSON.parse(gunzipSync(readFileSync(join(PACKS_DIR, 'bible.TA.json.gz'))).toString('utf8')) as {
  meta: { completeness: string; ecclesiasticalApproval?: boolean };
  books: Record<string, Record<string, [number, string][]>>;
};
const vulg = JSON.parse(gunzipSync(readFileSync(join(PACKS_DIR, 'bible.VULG.json.gz'))).toString('utf8')) as typeof pack;
const NT_PRESENT = ['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', 'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev'];

describe('bible.TA (Torres Amat, parcial)', () => {
  it('está marcada parcial y contiene exactamente los 15 libros transcritos', () => {
    expect(pack.meta.completeness).toBe('partial');
    expect(Object.keys(pack.books).sort()).toEqual([...NT_PRESENT].sort());
  });
  it('cada libro tiene el nº de capítulos esperado y versículos consecutivos', () => {
    for (const b of CANON.filter((c) => NT_PRESENT.includes(c.osis))) {
      const book = pack.books[b.osis]!;
      expect(Object.keys(book).length, b.osis).toBe(b.vulgateChapters);
      for (const [ch, vs] of Object.entries(book)) {
        const nums = vs.map(([n]) => n);
        const skipsMt14 = b.osis === 'Matt' && ch === '14'; // errata de la edición de 1836: falta el v. 12
        if (!skipsMt14) expect(nums, `${b.osis} ${ch}`).toEqual(nums.map((_, i) => i + 1));
      }
    }
  });
  it('los capítulos tienen los mismos versículos que la Vulgata Clementina (salvo erratas documentadas)', () => {
    const diffs: string[] = [];
    for (const osis of NT_PRESENT) for (const [ch, vs] of Object.entries(vulg.books[osis]!)) {
      const n = pack.books[osis]![ch]!.length;
      if (n !== vs.length) diffs.push(`${osis} ${ch}: TA ${n} / VULG ${vs.length}`);
    }
    expect(diffs).toEqual(['Matt 14: TA 35 / VULG 36']);
  });
  it('no quedan restos de marcado, cifras ni mayúsculas sueltas', () => {
    const bad = /[{}|\[\]<>*=+]|\s{2}|\d|(?<=\p{Ll})\p{Lu}(?=\p{Ll})|'{2}|\s[,.;:!?]/u;
    const hits: string[] = [];
    for (const [b, bk] of Object.entries(pack.books)) for (const [c, vs] of Object.entries(bk)) for (const [v, t] of vs) {
      if (!t.trim() || bad.test(t) || t !== t.trim()) hits.push(`${b} ${c}:${v}`);
    }
    expect(hits).toEqual([]);
  });
  it('pasajes conocidos (comparados con el escaneo)', () => {
    const v = (b: string, c: number, n: number) => pack.books[b]![String(c)]!.find(([x]) => x === n)![1];
    expect(v('Matt', 5, 3)).toBe('Bienaventurados los pobres de espíritu, porque de ellos es el reino de los cielos.');
    expect(v('John', 1, 1)).toBe('En el principio era ya el Verbo, y el Verbo estaba en Dios, y el Verbo era Dios.');
    expect(v('Rev', 21, 4)).toMatch(/^y Dios enjugará de sus ojos todas las lágrimas: ni habrá ya muerte/);
    expect(v('1Cor', 13, 13)).toMatch(/^Ahora permanecen estas tres virtudes, la fé, la esperanza y la caridad/);
    expect(v('Matt', 14, 11)).toBe('En seguida fue traída su cabeza en una fuente,');
    expect(v('John', 21, 25)).toMatch(/^Muchas otras cosas hay que hizo Jesus/);
  });
});
