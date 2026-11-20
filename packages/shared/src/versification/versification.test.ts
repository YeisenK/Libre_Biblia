import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { convertRef, convertVerse, Versification, VersificationTradition } from './index';

const v = (b: string, c: number, vv: number, from: VersificationTradition, to: VersificationTradition) => convertVerse(b, c, vv, from, to);

describe('versificación: pares conocidos (TVTMS)', () => {
  it('Salmos: la Vulgata cuenta el título como parte del v. 1 (o como v. 1 aparte si lo lleva)', () => {
    // DRA Sal 22,1 = «A psalm for David. The Lord ruleth me» (el título va dentro del v. 1)
    expect(v('Ps', 22, 1, 'vulgate', 'english')).toEqual({ chapter: 23, verse: 1 });
    expect(v('Ps', 22, 1, 'vulgate', 'hebrew')).toEqual({ chapter: 23, verse: 1 });
    expect(v('Ps', 23, 1, 'english', 'vulgate')).toEqual({ chapter: 22, verse: 1 });
  });
  it('Sal 50,3 (vulgata) = 51,1 (inglés) = 51,3 (hebreo)', () => {
    expect(v('Ps', 50, 3, 'vulgate', 'english')).toEqual({ chapter: 51, verse: 1 });
    expect(v('Ps', 50, 3, 'vulgate', 'hebrew')).toEqual({ chapter: 51, verse: 3 });
    expect(v('Ps', 51, 1, 'english', 'hebrew')).toEqual({ chapter: 51, verse: 3 });
    expect(v('Ps', 51, 3, 'hebrew', 'english')).toEqual({ chapter: 51, verse: 1 });
    expect(v('Ps', 51, 1, 'english', 'vulgate')).toEqual({ chapter: 50, verse: 3 });
  });
  it('título del salmo: verso 0 en english; v. 1-2 en hebrew/vulgate', () => {
    expect(v('Ps', 50, 1, 'vulgate', 'english')).toEqual({ chapter: 51, verse: 0 });
    expect(v('Ps', 51, 1, 'hebrew', 'english')).toEqual({ chapter: 51, verse: 0 });
  });
  it('Sal 9,22 (vulgata) = 10,1 (inglés); Sal 9 y 10 hebreos son un solo salmo en la Vulgata', () => {
    expect(v('Ps', 9, 22, 'vulgate', 'english')).toEqual({ chapter: 10, verse: 1 });
    expect(v('Ps', 10, 1, 'english', 'vulgate')).toEqual({ chapter: 9, verse: 22 });
  });
  it('Is 9,1 (inglés) = 8,23 (hebreo); la Vulgata sigue el inglés', () => {
    expect(v('Isa', 9, 1, 'english', 'hebrew')).toEqual({ chapter: 8, verse: 23 });
    expect(v('Isa', 8, 23, 'hebrew', 'english')).toEqual({ chapter: 9, verse: 1 });
    expect(v('Isa', 9, 1, 'vulgate', 'english')).toEqual({ chapter: 9, verse: 1 });
  });
  it('Ml 4,1 (inglés/vulgata) = Ml 3,19 (hebreo)', () => {
    expect(v('Mal', 4, 1, 'english', 'hebrew')).toEqual({ chapter: 3, verse: 19 });
    expect(v('Mal', 3, 19, 'hebrew', 'vulgate')).toEqual({ chapter: 4, verse: 1 });
  });
  it('Jl 2,28 (inglés) = Jl 3,1 (hebreo); Joel tiene 3 capítulos en la Vulgata', () => {
    expect(v('Joel', 2, 28, 'english', 'hebrew')).toEqual({ chapter: 3, verse: 1 });
    expect(v('Joel', 3, 1, 'vulgate', 'hebrew')).toEqual({ chapter: 4, verse: 1 });
  });
  it('versículos divididos/unidos y desplazados en otros libros', () => {
    expect(v('Hos', 1, 10, 'english', 'hebrew')).toEqual({ chapter: 2, verse: 1 });
    expect(v('Jonah', 2, 1, 'english', 'hebrew')).toEqual({ chapter: 2, verse: 2 });
    expect(v('Jonah', 1, 17, 'english', 'hebrew')).toEqual({ chapter: 2, verse: 1 });
    expect(v('Gen', 50, 23, 'vulgate', 'english')).toEqual({ chapter: 50, verse: 24 });
    expect(v('Gen', 50, 24, 'english', 'vulgate')).toEqual({ chapter: 50, verse: 23 }); // unidos: el primero
    expect(v('Isa', 45, 23, 'english', 'vulgate')).toEqual({ chapter: 45, verse: 23 }); // dividido: el primero
  });
  it('versículos inexistentes en el destino', () => {
    expect(v('Dan', 3, 52, 'vulgate', 'english')).toBeNull(); // Cántico de los tres jóvenes
    expect(v('Dan', 3, 24, 'vulgate', 'hebrew')).toBeNull();
    expect(v('Dan', 3, 91, 'vulgate', 'english')).toEqual({ chapter: 3, verse: 24 });
    expect(v('Dan', 3, 98, 'vulgate', 'hebrew')).toEqual({ chapter: 3, verse: 31 });
    expect(v('Esth', 11, 2, 'vulgate', 'english')).toBeNull(); // adiciones deuterocanónicas
    expect(v('Esth', 10, 3, 'vulgate', 'english')).toEqual({ chapter: 10, verse: 3 });
  });
  it('identidad y misma versificación', () => {
    expect(v('Gen', 1, 1, 'vulgate', 'hebrew')).toEqual({ chapter: 1, verse: 1 });
    expect(v('Ps', 23, 1, 'hebrew', 'hebrew')).toEqual({ chapter: 23, verse: 1 });
    expect(v('John', 3, 16, 'vulgate', 'english')).toEqual({ chapter: 3, verse: 16 });
  });
  it('los Salmos hebreo↔inglés solo difieren en los títulos', () => {
    expect(v('Ps', 52, 3, 'hebrew', 'english')).toEqual({ chapter: 52, verse: 1 });
    expect(v('Ps', 3, 3, 'hebrew', 'english')).toEqual({ chapter: 3, verse: 2 });
    expect(v('Ps', 8, 2, 'hebrew', 'english')).toEqual({ chapter: 8, verse: 1 });
  });
});

describe('convertRef', () => {
  it('versículo y rango', () => {
    expect(convertRef({ book: 'Ps', chapter: 50, verseStart: 3, verseEnd: 6 }, 'vulgate', 'english')).toEqual({ book: 'Ps', chapter: 51, verseStart: 1, verseEnd: 4 });
    expect(convertRef({ book: 'Ps', chapter: 51, verseStart: 1, verseEnd: 2 }, 'english', 'vulgate')).toEqual({ book: 'Ps', chapter: 50, verseStart: 3, verseEnd: 4 });
    expect(convertRef({ book: 'John', chapter: 3, verseStart: 16 }, 'vulgate', 'hebrew')).toEqual({ book: 'John', chapter: 3, verseStart: 16 });
  });
  it('rango que cruza de capítulo en el destino', () => {
    expect(convertRef({ book: 'Joel', chapter: 2, verseStart: 27, verseEnd: 32 }, 'english', 'hebrew')).toEqual({
      book: 'Joel', chapter: 2, verseStart: 27, chapterEnd: 3, verseEnd: 5,
    });
  });
  it('capítulo completo', () => {
    expect(convertRef({ book: 'Ps', chapter: 23 }, 'english', 'vulgate')).toEqual({ book: 'Ps', chapter: 22, verseStart: 1, verseEnd: 6 });
    expect(convertRef({ book: 'Joel', chapter: 3 }, 'hebrew', 'english')).toMatchObject({ book: 'Joel', chapter: 2, verseStart: 28 });
    expect(convertRef({ book: 'Gen', chapter: 1 }, 'vulgate', 'english')).toEqual({ book: 'Gen', chapter: 1 });
  });
  it('rango del que el inicio no existe en el destino se ajusta al primer versículo existente', () => {
    expect(convertRef({ book: 'Dan', chapter: 3, verseStart: 50, verseEnd: 91 }, 'vulgate', 'english')).toEqual({ book: 'Dan', chapter: 3, verseStart: 24 });
  });
});

// ── Validación empírica con los paquetes reales (si existen) ────────────────
type Books = Record<string, Record<string, [number, string][]>>;
const packsDir = fileURLToPath(new URL('../../../../content/packs/', import.meta.url));
const load = (id: string): Books | null => {
  const f = `${packsDir}bible.${id}.json.gz`;
  return existsSync(f) ? (JSON.parse(gunzipSync(readFileSync(f)).toString()).books as Books) : null;
};
const DRA = load('DRA');
const eng: Record<string, Books | null> = { SBLM: load('SBLM'), BLL: load('BLL') };

function validate(A: Books, B: Books, from: Versification, to: Versification) {
  const has = (b: string, c: number, vv: number) => !!B[b]?.[c]?.some((x) => x[0] === vv);
  let total = 0, ok = 0, nul = 0, titles = 0;
  const fails: Record<string, string[]> = {};
  for (const b of Object.keys(A))
    for (const [c, vs] of Object.entries(A[b]!))
      for (const [vv] of vs) {
        total++;
        const r = convertVerse(b, +c, vv, from, to);
        if (!r) nul++;
        else if (r.verse === 0) titles++;
        else if (has(b, r.chapter, r.verse)) ok++;
        else (fails[b] ??= []).push(`${c}:${vv}→${r.chapter}:${r.verse}`);
      }
  const checked = total - nul - titles;
  return { total, ok, nul, titles, pct: (100 * ok) / checked, fails };
}

describe.skipIf(!DRA || !eng.SBLM)('validación empírica DRA (vulgate) ⇄ SBLM/BLL (english)', () => {
  for (const code of ['SBLM', 'BLL']) {
    it(`${code}: vulgate→english y english→vulgate caen dentro de rango (≥ 99,5 %)`, () => {
      const B = eng[code];
      if (!B) return;
      const fwd = validate(DRA!, B, 'vulgate', 'english');
      const back = validate(B, DRA!, 'english', 'vulgate');
      const fmt = (r: ReturnType<typeof validate>) =>
        `${r.ok}/${r.total - r.nul - r.titles} (${r.pct.toFixed(2)} %), sin equivalente: ${r.nul}, títulos: ${r.titles}; fallos: ` +
        Object.entries(r.fails).map(([b, f]) => `${b}(${f.length})`).join(' ');
      console.log(`[${code}] vulgate→english ${fmt(fwd)}\n[${code}] english→vulgate ${fmt(back)}`);
      expect(fwd.pct).toBeGreaterThan(99.5);
      expect(back.pct).toBeGreaterThan(99.5);
      // Los Salmos y los profetas menores no deben fallar ni un versículo.
      for (const b of ['Ps', 'Hos', 'Joel', 'Amos', 'Jonah', 'Mic', 'Mal', 'Isa', 'Gen', 'Exod', 'Num']) expect(fwd.fails[b] ?? [], `${code} ${b}`).toEqual([]);
    });
  }
  it('Salmos: ida y vuelta english→vulgate→english conserva el versículo (salvo salmos partidos)', () => {
    const B = eng.SBLM!;
    let n = 0, same = 0;
    for (const [c, vs] of Object.entries(B.Ps!))
      for (const [vv] of vs) {
        n++;
        const a = convertVerse('Ps', +c, vv, 'english', 'vulgate')!;
        const back = convertVerse('Ps', a.chapter, a.verse, 'vulgate', 'english')!;
        if (back.chapter === +c && back.verse === vv) same++;
      }
    expect(same / n).toBeGreaterThan(0.99);
  });
});
