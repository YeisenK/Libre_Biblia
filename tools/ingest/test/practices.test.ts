import { describe, expect, it } from 'vitest';
import { loadPrayerSources, validatePrayers } from '../src/prayers';

describe('prácticas guiadas', () => {
  const src = loadPrayerSources();
  it('las fuentes son válidas', () => {
    expect(validatePrayers(src)).toEqual([]);
  });
  it('incluyen examen, confesión, hora santa y estaciones', () => {
    const kinds = new Set((src.practices ?? []).map((p) => p.kind));
    expect([...kinds].sort()).toEqual(['adoration', 'confession', 'examen', 'stations']);
    const st = (src.practices ?? []).filter((p) => p.kind === 'stations');
    for (const p of st) expect(p.steps.filter((s) => s.kind === 'station')).toHaveLength(14);
  });
  it('la guía de confesión no copia la fórmula de absolución del Ritual', () => {
    const t = JSON.stringify((src.practices ?? []).find((p) => p.id === 'guia-confesion'));
    expect(t).not.toMatch(/yo te absuelvo/i);
    expect(t).toMatch(/1449/);
  });
});
