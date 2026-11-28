import { describe, expect, it } from 'vitest';
import type { Practice } from '@bc/shared';
import { formatClock, planAdoration, planSeconds } from './plan';

const p = {
  id: 'x', kind: 'adoration', title: 't', description: 'd', nature: 'original',
  steps: [
    { id: 'a', kind: 'text', title: 'a', text: 'x', seconds: 60 },
    { id: 's1', kind: 'silence', title: 's', seconds: 120, weight: 1 },
    { id: 'b', kind: 'text', title: 'b', text: 'x', seconds: 60, minDuration: 30 },
    { id: 's2', kind: 'silence', title: 's', seconds: 120, weight: 3 },
  ],
} as Practice;

describe('planAdoration', () => {
  it('filtra por duración y reparte el silencio hasta completar el tiempo', () => {
    const a = planAdoration(p, 15);
    expect(a.map((s) => s.id)).toEqual(['a', 's1', 's2']);
    expect(Math.abs(planSeconds(a) - 900)).toBeLessThanOrEqual(10);
    const b = planAdoration(p, 30);
    expect(b).toHaveLength(4);
    expect(b[3]!.seconds).toBeGreaterThan(b[1]!.seconds);
    expect(Math.abs(planSeconds(b) - 1800)).toBeLessThanOrEqual(10);
  });
  it('modo solo silencio', () => {
    const s = planAdoration(p, 60, { silentOnly: true });
    expect(s).toHaveLength(1);
    expect(s[0]!.seconds).toBe(3600);
  });
  it('formatea el reloj', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(0)).toBe('0:00');
  });
});
