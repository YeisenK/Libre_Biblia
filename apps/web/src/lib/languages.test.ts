import { describe, expect, it } from 'vitest';
import { isPrimaryLanguage, pickVisibleVersion, visibleVersions } from './languages';

const list = [
  { code: 'BTX', language: 'es' },
  { code: 'RVR', language: 'es-419' },
  { code: 'VUL', language: 'la' },
  { code: 'DRA', language: 'en' },
  { code: 'KJV', language: 'en' },
];

describe('idiomas visibles', () => {
  it('reconoce español y latín', () => {
    expect(list.filter(isPrimaryLanguage).map((v) => v.code)).toEqual(['BTX', 'RVR', 'VUL']);
  });
  it('oculta otros idiomas por defecto y los muestra si se activa', () => {
    expect(visibleVersions(list, false).map((v) => v.code)).toEqual(['BTX', 'RVR', 'VUL']);
    expect(visibleVersions(list, true)).toHaveLength(5);
  });
  it('si solo hay Biblias de otros idiomas, las muestra para no dejar la app vacía', () => {
    const en = [{ code: 'DRA', language: 'en' }];
    expect(visibleVersions(en, false)).toEqual(en);
  });
  it('pasa a la española si la versión actual está oculta', () => {
    const vis = visibleVersions(list, false);
    expect(pickVisibleVersion(['DRA', 'KJV'], vis)).toBe('BTX');
    expect(pickVisibleVersion([null, 'VUL'], vis)).toBe('VUL');
    expect(pickVisibleVersion(['DRA'], visibleVersions(list, true))).toBe('DRA');
    expect(pickVisibleVersion([], [])).toBeNull();
  });
});

import { DEFAULT_SETTINGS } from './settings';
describe('ajuste «otros idiomas»', () => {
  it('por defecto está desactivado', () => {
    expect(DEFAULT_SETTINGS.showOtherLanguageBibles).toBe(false);
  });
});
