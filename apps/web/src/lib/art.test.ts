import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART_CREDITS, artFor, artForAny, bookArtKeys, hasOwnArt } from './art';

const PRAYERS = join(__dirname, '../../../../tools/ingest/sources/prayers');
const PUBLIC = join(__dirname, '../../public');
const CATALOG = join(__dirname, '../../../../content/catalog.json');
const MAX_BYTES = 75 * 1024;

describe('arte sacro', () => {
  it('cada src existe en public/ y no hay créditos duplicados', () => {
    for (const a of ART_CREDITS) {
      expect(existsSync(join(PUBLIC, a.src)), a.src).toBe(true);
      expect(a.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
    expect(new Set(ART_CREDITS.map((a) => a.src)).size).toBe(ART_CREDITS.length);
  });

  it('los 20 misterios y los 4 conjuntos resuelven', () => {
    const rosary = JSON.parse(readFileSync(join(PRAYERS, 'rosary.json'), 'utf8'));
    expect(rosary.mysteries).toHaveLength(20);
    for (const m of rosary.mysteries) expect(artFor(`mystery:${m.set}-${m.n}`), `${m.set}-${m.n}`).not.toBeNull();
    for (const s of rosary.sets) expect(artFor(`set:${s.set}`), s.set).not.toBeNull();
  });

  it('todas las novenas, los momentos, las categorías y la portada resuelven', () => {
    const novenas = readdirSync(join(PRAYERS, 'novenas')).filter((f) => f.endsWith('.json'));
    expect(novenas.length).toBeGreaterThanOrEqual(28);
    for (const f of novenas) expect(artFor(`novena:${f.replace(/\.json$/, '')}`), f).not.toBeNull();
    for (const m of ['morning', 'midday', 'afternoon', 'night']) expect(artFor(`moment:${m}`), m).not.toBeNull();
    const cats = JSON.parse(readFileSync(join(PRAYERS, 'categories.json'), 'utf8'));
    for (const c of cats) expect(artFor(`category:${c.id}`), c.id).not.toBeNull();
    expect(artFor('home:default')).not.toBeNull();
    expect(artFor('desconocida:x')).toBeNull();
  });

  it('cada imagen pesa menos de ~70 KB y el total no pasa de 12 MB', () => {
    let total = 0;
    for (const a of ART_CREDITS) {
      const size = statSync(join(PUBLIC, a.src)).size;
      expect(size, a.src).toBeLessThan(MAX_BYTES);
      total += size;
    }
    expect(total).toBeLessThan(12 * 1024 * 1024);
    expect(ART_CREDITS.length).toBeGreaterThanOrEqual(140);
  });

  it('cada oración tiene imagen (propia o de su categoría) y la mayoría tiene imagen propia', () => {
    const files = readdirSync(join(PRAYERS, 'prayers')).filter((f) => f.endsWith('.json'));
    let n = 0;
    let own = 0;
    for (const f of files) {
      for (const p of JSON.parse(readFileSync(join(PRAYERS, 'prayers', f), 'utf8'))) {
        n++;
        if (hasOwnArt(`prayer:${p.id}`)) own++;
        expect(artForAny([`prayer:${p.id}`, `category:${p.categories[0]}`, 'home:default']), p.id).not.toBeNull();
      }
    }
    expect(n).toBeGreaterThan(80);
    expect(own).toBeGreaterThanOrEqual(85);
    expect(artFor('prayer:no-existe')).not.toBeNull(); // respaldo a la portada
  });

  it('cada libro del catálogo tiene portada propia; los desconocidos usan el genérico', () => {
    const packs: { id: string; kind: string }[] = JSON.parse(readFileSync(CATALOG, 'utf8')).packs;
    const books = packs.filter((p) => p.kind === 'bible' || p.kind === 'document');
    expect(books.length).toBeGreaterThan(15);
    // Todos resuelven (propia o genérica); la mayoría con portada propia.
    for (const b of books) expect(artForAny(bookArtKeys(b.id, b.kind as 'bible' | 'document')), b.id).not.toBeNull();
    expect(books.filter((b) => hasOwnArt(`book:${b.id}`)).length).toBeGreaterThanOrEqual(19);
    expect(artForAny(bookArtKeys('bible.XYZ', 'bible'))).toBe(artFor('book:bible'));
    expect(artForAny(bookArtKeys('doc.nuevo', 'document'))).toBe(artFor('book:doc'));
    expect(artFor('book:bible')).not.toBeNull();
    expect(artFor('book:doc')).not.toBeNull();
  });
});
