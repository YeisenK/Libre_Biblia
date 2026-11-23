import { describe, expect, it } from 'vitest';
import type { Novena, Prayer } from '@bc/shared';
import { plainMarkdown, searchPrayers, type SearchableCatalog } from './search';

const prayer = (p: Partial<Prayer> & { id: string; title: string }): Prayer => ({ categories: ['marianas'], nature: 'prayer', text: '', ...p });
const novena: Novena = {
  id: 'novena-inmaculada',
  title: 'Novena a la Inmaculada',
  group: 'marian',
  description: 'Nueve días con María.',
  introduction: 'Historia.',
  purpose: 'Honrar a María.',
  nature: 'popular_piety',
  opening: [],
  closing: [],
  days: [{ day: 1, reflection: 'Llena de gracia', prayer: 'Oh María' }],
  saints: ['Inmaculada Concepción'],
};
const cat: SearchableCatalog = {
  categories: [{ id: 'marianas', title: 'Marianas', order: 1 }],
  prayers: [
    prayer({ id: 'ave-maria', title: 'Ave María', text: 'Dios te salve, María, llena de gracia', altTitles: ['Salutación angélica'] }),
    prayer({ id: 'salve', title: 'Salve', text: 'Dios te salve, Reina y Madre de misericordia', tags: ['maria'] }),
    prayer({ id: 'angelus', title: 'Ángelus', text: 'El ángel del Señor anunció a María <script>', saints: [] }),
  ],
  novenas: [novena],
};

describe('searchPrayers', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(searchPrayers(cat, 'AVE MARIA')[0]?.id).toBe('ave-maria');
    expect(searchPrayers(cat, 'angelus')[0]?.id).toBe('angelus');
  });
  it('encuentra por título alternativo', () => {
    expect(searchPrayers(cat, 'salutacion')[0]?.id).toBe('ave-maria');
  });
  it('pondera título sobre etiqueta y texto, e incluye novenas', () => {
    const r = searchPrayers(cat, 'maria');
    expect(r[0]?.id).toBe('ave-maria');
    expect(r.map((x) => x.id)).toEqual(expect.arrayContaining(['salve', 'angelus', 'novena-inmaculada']));
    expect(r.find((x) => x.id === 'novena-inmaculada')?.kind).toBe('novena');
  });
  it('exige todas las palabras y acepta prefijos', () => {
    expect(searchPrayers(cat, 'madre misericordia').map((x) => x.id)).toEqual(['salve']);
    expect(searchPrayers(cat, 'misericordia zzz')).toEqual([]);
    expect(searchPrayers(cat, 'inmacul')[0]?.id).toBe('novena-inmaculada');
  });
  it('resalta y escapa HTML', () => {
    const r = searchPrayers(cat, 'angel').find((x) => x.id === 'angelus')!;
    expect(r.snippetHtml).toContain('<mark>');
    expect(r.snippetHtml).not.toContain('<script>');
    expect(r.snippetHtml).toContain('&lt;script&gt;');
  });
  it('consulta vacía no devuelve nada', () => {
    expect(searchPrayers(cat, '  ')).toEqual([]);
  });
  it('plainMarkdown quita marcas', () => {
    expect(plainMarkdown('**V.** Señor\n> *R.* Amén')).toBe('V. Señor R. Amén');
  });
});
