import { describe, expect, it } from 'vitest';
import { compareVersions } from './queries';
import { firstSpanishFirst } from '@/hooks/useBible';

describe('español primero (ADR-018)', () => {
  const list = [
    { code: 'KJV', language: 'en' },
    { code: 'VUL', language: 'la' },
    { code: 'RVR', language: 'es-419' },
    { code: 'BTX', language: 'es' },
  ];
  it('ordena español, latín y el resto', () => {
    expect([...list].sort(compareVersions).map((v) => v.code)).toEqual(['BTX', 'RVR', 'VUL', 'KJV']);
  });
  it('elige la primera Biblia en español como predeterminada', () => {
    expect(firstSpanishFirst([...list].sort(compareVersions))).toBe('BTX');
    expect(firstSpanishFirst([{ code: 'KJV', language: 'en' }])).toBe('KJV');
    expect(firstSpanishFirst([])).toBeNull();
  });
});
