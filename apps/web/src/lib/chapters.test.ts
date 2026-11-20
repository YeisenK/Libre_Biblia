import { describe, expect, it } from 'vitest';
import { alignParallel, buildIndex, formatBytes, neighbors, orderedBooks } from './chapters';

describe('capítulos', () => {
  const index = buildIndex({ John: { '1': [], '2': [] }, Gen: { '1': [] } });
  it('ordena libros en orden canónico y calcula vecinos', () => {
    expect(orderedBooks(index)).toEqual(['Gen', 'John']);
    expect(neighbors(index, 'Gen', 1)).toEqual({ prev: null, next: { book: 'John', chapter: 1 } });
    expect(neighbors(index, 'John', 2)).toEqual({ prev: { book: 'John', chapter: 1 }, next: null });
  });
  it('formatea bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
  });
  it('alinea versículos con huecos', () => {
    expect(alignParallel(['A', 'B'], { A: [{ verse: 1, text: 'x' }], B: [{ verse: 2, text: 'z' }] })).toEqual([
      { verse: 1, texts: { A: 'x', B: null } },
      { verse: 2, texts: { A: null, B: 'z' } },
    ]);
  });
});
