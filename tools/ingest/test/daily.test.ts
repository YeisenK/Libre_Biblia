import { describe, expect, it } from 'vitest';
import { allDates, buildDailyPack, parseDailyMarkdown, validateDaily } from '../src/daily';
import type { DailyEntry } from '@bc/shared';

const words = (n: number) => Array.from({ length: n }, () => 'palabra').join(' ');
const md = (date: string, cita = 'Jn 3,16-17') => [
  `## ${date} · Título ${date}`, '- Tema: Un tema', `- Cita: ${cita}`, '- Relacionadas: Sal 23,1-4; Lc 2,1-7', '',
  '### Contexto', 'Contexto breve.', '', '### Reflexión', words(90), '', '### Para meditar', '1. Primera pregunta.', '2. Segunda pregunta.', '',
  '### Oración', `${words(40)} Amén.`, '', '',
].join('\n');

describe('parseDailyMarkdown', () => {
  const es = parseDailyMarkdown('# Cabecera\n\n' + md('01-01') + md('02-29', 'Mt 5,1-3'), 'x.md');
  it('lee las entradas', () => {
    expect(es.map((e) => e.date)).toEqual(['01-01', '02-29']);
    expect(es[0]).toMatchObject({ title: 'Título 01-01', theme: 'Un tema', ref: 'Jn 3,16-17', psalmNumbering: 'hebrew' });
    expect(es[0]!.related).toEqual(['Sal 23,1-4', 'Lc 2,1-7']);
    expect(es[0]!.questions).toHaveLength(2);
    expect(es[0]!.prayer.endsWith('Amén.')).toBe(true);
  });
  it('falla si falta una sección', () => {
    expect(() => parseDailyMarkdown(md('01-01').replace('### Oración', '### Otra'), 'x.md')).toThrow(/Oración/);
  });
});

describe('validateDaily', () => {
  const full = (): DailyEntry[] => allDates().map((d, i) => parseDailyMarkdown(md(d, `Sal ${(i % 150) + 1},1-2`))[0]!);
  it('allDates tiene 366 días con 02-29', () => {
    const d = allDates();
    expect(d).toHaveLength(366);
    expect(d).toContain('02-29');
  });
  it('acepta un año completo distinto', () => {
    const es = full().map((e, i) => ({ ...e, ref: `Ref ${i}` }));
    expect(validateDaily(es, { strictWords: true })).toEqual([]);
  });
  it('detecta fechas que faltan, duplicadas y citas repetidas', () => {
    const es = full().map((e, i) => ({ ...e, ref: `Ref ${i}` }));
    es[1] = { ...es[0]!, ref: es[0]!.ref };
    const errs = validateDaily(es);
    expect(errs.some((e) => e.includes('fecha duplicada'))).toBe(true);
    expect(errs.some((e) => e.includes('falta la fecha'))).toBe(true);
    expect(errs.some((e) => e.includes('Cita repetida'))).toBe(true);
  });
  it('detecta preguntas, palabras y Amén', () => {
    const e = parseDailyMarkdown(md('01-01'))[0]!;
    const errs = validateDaily([{ ...e, questions: ['una'], reflection: 'corta', prayer: 'sin cierre' }], { strictWords: true });
    expect(errs.some((x) => x.includes('preguntas'))).toBe(true);
    expect(errs.some((x) => x.includes('reflexión'))).toBe(true);
    expect(errs.some((x) => x.includes('Amén'))).toBe(true);
  });
});

describe('buildDailyPack', () => {
  it('construye un DailyPack borrador ordenado', () => {
    const es = [md('03-01'), md('01-01')].flatMap((m) => parseDailyMarkdown(m));
    const p = buildDailyPack(es, 'abc', '2026-11-20T00:00:00.000Z');
    expect(p).toMatchObject({ kind: 'daily', id: 'daily.ciclo-tematico', version: '2026.11.20' });
    expect(p.meta).toMatchObject({ status: 'draft', authority: 'devotional', language: 'es' });
    expect(p.entries.map((e) => e.date)).toEqual(['01-01', '03-01']);
    expect(p.meta.source.originalSha256).toBe('abc');
  });
});
