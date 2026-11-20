import { describe, expect, it } from 'vitest';
import { assignPaths, naturalKey } from '../src/culture/build';

describe('naturalKey', () => {
  it('ordena numerales romanos y arábigos de forma natural', () => {
    const labels = ['X', 'II', 'IX', 'I', 'Capítulo XV', 'Capítulo III', '10', '9'];
    const sorted = [...labels].sort((a, b) => { const ka = naturalKey(a), kb = naturalKey(b); return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]); });
    expect(sorted).toEqual(['I', 'II', 'Capítulo III', '9', 'IX', '10', 'X', 'Capítulo XV']);
  });
});

describe('assignPaths', () => {
  it('numera jerárquicamente por profundidad', () => {
    const r = assignPaths([
      { title: 'A', depth: 0, text: '' }, { title: 'a1', depth: 1, text: 'x' }, { title: 'a2', depth: 1, text: 'y' },
      { title: 'B', depth: 0, text: 'z' }, { title: 'b1', depth: 1, text: 'w' },
    ]);
    expect(r.map((s) => s.path)).toEqual(['1', '1.1', '1.2', '2', '2.1']);
  });
});
