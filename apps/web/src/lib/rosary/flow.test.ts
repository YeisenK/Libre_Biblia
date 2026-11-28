// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Mystery, MysterySet, RosaryData } from '@bc/shared';
import { buildSteps, firstStepOfDecade, mysteryHeading, optionsKey, parseOptionsKey, phaseOf, progressOf, reachedBead, todaySet, BEAD_COUNT } from './flow';

const sets: MysterySet[] = ['joyful', 'luminous', 'sorrowful', 'glorious'];
const mysteries: Mystery[] = sets.flatMap((set) =>
  ([1, 2, 3, 4, 5] as const).map((n) => ({ set, n, title: `Misterio ${set} ${n}`, ref: `Lc ${n},1-5`, reflection: 'Reflexión', teaching: 'Enseñanza' })),
);
const rosary: RosaryData = {
  sets: sets.map((set) => ({ set, title: set, weekdays: [], description: '' })),
  mysteries,
  extras: [
    { id: 'fatima', title: 'Oración de Fátima', place: 'after_decade', prayer: 'oracion-fatima', defaultOn: true },
    { id: 'letania', title: 'Letanía lauretana', place: 'final', prayer: 'letania-lauretana', defaultOn: false },
    { id: 'san-miguel', title: 'San Miguel', place: 'final', prayer: 'san-miguel-arcangel', defaultOn: false },
  ],
  introduction: '',
};
const full = { reflections: true, passages: true, extras: ['fatima'] };

describe('buildSteps', () => {
  const steps = buildSteps(rosary, 'sorrowful', { reflections: false, passages: false, extras: [] });

  it('sigue el orden tradicional del inicio', () => {
    expect(steps.slice(0, 7).map((s) => s.prayerId)).toEqual(['senal-de-la-cruz', 'credo-apostoles', 'padre-nuestro', 'ave-maria', 'ave-maria', 'ave-maria', 'gloria']);
    expect(steps.slice(3, 6).map((s) => s.aveIndex)).toEqual([1, 2, 3]);
  });

  it('termina con Salve y señal de la cruz', () => {
    expect(steps.at(-2)!.prayerId).toBe('salve');
    expect(steps.at(-1)!.prayerId).toBe('senal-de-la-cruz');
  });

  it('cada misterio: anuncio, Padre Nuestro, 10 Ave Marías, Gloria', () => {
    const d3 = steps.filter((s) => s.decade === 3);
    expect(d3.map((s) => s.kind)).toEqual(['announce', 'prayer', ...Array(10).fill('prayer'), 'prayer']);
    expect(d3.filter((s) => s.prayerId === 'ave-maria').map((s) => s.aveIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(d3[0]!.instruction).toBe('Tercer misterio doloroso: Misterio sorrowful 3');
    expect(d3[0]!.audioKey).toBe('mystery:sorrowful-3:announce');
  });

  it('total sin opciones: 7 + 5×13 + 2', () => {
    expect(steps).toHaveLength(7 + 5 * 13 + 2);
  });

  it('ids únicos y estables', () => {
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(buildSteps(rosary, 'sorrowful', { reflections: false, passages: false, extras: [] }).map((s) => s.id)).toEqual(ids);
  });

  it('añade pasaje y reflexión tras el anuncio y Fátima tras el Gloria', () => {
    const s = buildSteps(rosary, 'joyful', full);
    const d1 = s.filter((x) => x.decade === 1).map((x) => x.id);
    expect(d1.slice(0, 4)).toEqual(['d1-announce', 'd1-passage', 'd1-reflection', 'd1-pn']);
    expect(d1.slice(-2)).toEqual(['d1-gloria', 'd1-extra-fatima']);
    expect(s.find((x) => x.id === 'd2-passage')!.audioKey).toBe('mystery:joyful-2:passage');
    expect(s.find((x) => x.id === 'd2-extra-fatima')!.audioKey).toBe('prayer:oracion-fatima');
  });

  it('los extras finales siguen el orden del paquete, no el de los ajustes', () => {
    const s = buildSteps(rosary, 'joyful', { reflections: false, passages: false, extras: ['san-miguel', 'letania'] });
    expect(s.slice(-4).map((x) => x.id)).toEqual(['final-letania', 'final-san-miguel', 'salve', 'close-cross']);
  });

  it('ignora extras que no existen', () => {
    expect(buildSteps(rosary, 'joyful', { reflections: false, passages: false, extras: ['nada'] })).toHaveLength(steps.length);
  });

  it('las cuentas caen dentro del dibujo y las guías físicas existen', () => {
    for (const s of steps) {
      expect(s.bead.index).toBeGreaterThanOrEqual(0);
      expect(s.bead.index).toBeLessThan(BEAD_COUNT);
      expect(s.physicalCue.length).toBeGreaterThan(10);
    }
    expect(steps.find((s) => s.id === 'd1-pn')!.physicalCue).toBe('Toma la cuenta grande que sigue a la medalla y reza el Padre Nuestro.');
    expect(steps.find((s) => s.id === 'd2-gloria')!.physicalCue).toBe('Has terminado las diez Ave Marías. Ahora reza el Gloria.');
    expect(steps.find((s) => s.id === 'd1-ave-10')!.bead).toEqual({ index: 16, type: 'small' });
  });
});

describe('opciones y progreso', () => {
  it('optionsKey es estable y reversible', () => {
    const a = optionsKey({ reflections: true, passages: false, extras: ['b', 'a'] });
    expect(a).toBe(optionsKey({ reflections: true, passages: false, extras: ['a', 'b'] }));
    expect(parseOptionsKey(a)).toEqual({ reflections: true, passages: false, extras: ['a', 'b'] });
    expect(parseOptionsKey('basura')).toBeNull();
    expect(a).not.toBe(optionsKey(full));
  });

  it('progressOf: global y por misterio', () => {
    const s = buildSteps(rosary, 'glorious', { reflections: false, passages: false, extras: [] });
    const i = s.findIndex((x) => x.id === 'd2-ave-4');
    const p = progressOf(s, i);
    expect(p).toMatchObject({ current: i + 1, total: s.length, decade: 2, aveIndex: 4, decadeTotal: 13, inDecade: 6 });
    expect(progressOf(s, 0).decade).toBeNull();
    expect(progressOf(s, s.length - 1).fraction).toBe(1);
  });

  it('phaseOf y reachedBead', () => {
    const s = buildSteps(rosary, 'glorious', full);
    expect(phaseOf(s, 0)).toBe(0);
    expect(phaseOf(s, firstStepOfDecade(s, 4))).toBe(4);
    expect(phaseOf(s, s.length - 1)).toBe(6);
    expect(reachedBead(s, s.length - 1)).toBe(60);
  });

  it('mysteryHeading', () => {
    expect(mysteryHeading('sorrowful', 3)).toBe('Tercer misterio doloroso');
    expect(mysteryHeading('joyful', 1)).toBe('Primer misterio gozoso');
  });
});

describe('todaySet', () => {
  it('según el día de la semana', () => {
    expect(todaySet(new Date(2026, 10, 22, 12))).toBe('glorious'); // domingo
    expect(todaySet(new Date(2026, 10, 23, 12))).toBe('joyful'); // lunes
    expect(todaySet(new Date(2026, 10, 24, 12))).toBe('sorrowful'); // martes
    expect(todaySet(new Date(2026, 10, 26, 12))).toBe('luminous'); // jueves
  });
  it('respeta la zona horaria', () => {
    const d = new Date('2026-11-23T02:00:00Z'); // lunes 02:00 UTC = domingo 21:00 en Lima
    expect(todaySet(d, 'UTC')).toBe('joyful');
    expect(todaySet(d, 'America/Lima')).toBe('glorious');
  });
});

import { decadeLayout, fullLayout } from './beads';
describe('geometría de cuentas', () => {
  it('el dibujo completo tiene todas las cuentas una vez', () => {
    const l = fullLayout();
    expect(l.beads.map((b) => b.index)).toEqual(Array.from({ length: BEAD_COUNT }, (_, i) => i));
    expect(l.beads.filter((b) => b.type === 'large')).toHaveLength(6);
    expect(l.beads.filter((b) => b.x < 0 || b.x > l.width || b.y > l.height)).toHaveLength(0);
  });
  it('la decena tiene 1 grande y 10 pequeñas', () => {
    const l = decadeLayout();
    expect(l.beads).toHaveLength(11);
    expect(l.beads.filter((b) => b.type === 'small')).toHaveLength(10);
  });
});

describe('rosario físico (Ave Marías agrupadas)', () => {
  const opts = { reflections: false, passages: false, extras: [], grouped: true };
  const g = buildSteps(rosary, 'sorrowful', opts);
  it('una sola etapa de diez Ave Marías por decena y tres al comienzo', () => {
    expect(g.filter((s) => s.id.endsWith('-aves'))).toHaveLength(6);
    expect(g.some((s) => /ave-\d/.test(s.id))).toBe(false);
    expect(g.find((s) => s.id === 'd4-aves')?.instruction).toBe('Reza diez Ave Marías');
    expect(g.find((s) => s.id === 'open-aves')?.title).toBe('Tres Ave Marías');
    // 11 pasos menos de Ave Marías por decena×5 (−45) y −2 al comienzo
    expect(buildSteps(rosary, 'sorrowful', { ...opts, grouped: false }).length - g.length).toBe(47);
  });
  it('la firma de opciones distingue el modo y es compatible con las antiguas', () => {
    expect(parseOptionsKey(optionsKey(opts))).toEqual(opts);
    expect(parseOptionsKey('r1p0xfatima')).toEqual({ reflections: true, passages: false, extras: ['fatima'] });
  });
});
