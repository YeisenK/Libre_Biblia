import type { Saint, SaintsPack } from '@bc/shared';

const base = { categories: ['martyr'] as Saint['categories'], summary: 'Resumen de prueba.', biography: 'Biografía de prueba.', sources: [{ label: 'Fuente de prueba' }] };

export const SAMPLE_SAINTS: Saint[] = [
  { ...base, id: 'juan-diego', name: 'San Juan Diego Cuauhtlatoatzin', status: 'saint', celebrations: [{ date: '12-09', rank: 'optional', calendar: 'general', title: 'San Juan Diego' }, { date: '12-09', rank: 'memorial', calendar: 'mx', title: 'San Juan Diego Cuauhtlatoatzin' }], novenas: ['san-juan-diego'] },
  { ...base, id: 'virgen-de-guadalupe', name: 'Nuestra Señora de Guadalupe', status: 'marian', celebrations: [{ date: '12-12', rank: 'solemnity', calendar: 'mx', title: 'Nuestra Señora de Guadalupe' }, { date: '12-12', rank: 'optional', calendar: 'general', title: 'Nuestra Señora de Guadalupe' }], prayers: ['acordaos'] },
  { ...base, id: 'felipe-de-jesus', name: 'San Felipe de Jesús', status: 'saint', celebrations: [{ date: '02-05', rank: 'feast', calendar: 'mx', title: 'San Felipe de Jesús, mártir', color: 'red' }] },
  { ...base, id: 'agueda', name: 'Santa Águeda', status: 'saint', celebrations: [{ date: '02-05', rank: 'memorial', calendar: 'general', title: 'Santa Águeda, virgen y mártir' }] },
  { ...base, id: 'jose-sanchez-del-rio', name: 'San José Sánchez del Río', status: 'saint', celebrations: [{ date: '02-10', rank: 'optional', calendar: 'mx', title: 'San José Sánchez del Río' }] },
  { ...base, id: 'francisco-de-asis', name: 'San Francisco de Asís', status: 'saint', celebrations: [{ date: '10-04', rank: 'memorial', calendar: 'general', title: 'San Francisco de Asís' }], unverified: true },
];

export const sampleSaintsPack = (version = '2026.11.25'): SaintsPack => ({
  format: 1,
  kind: 'saints',
  id: 'saints.es',
  version,
  language: 'es',
  meta: { title: 'Santoral', license: 'CC BY-SA 4.0', source: { name: 'Prueba', license: 'CC BY-SA 4.0', provenanceUrl: 'https://example.org', retrievedAt: '2026-11-25T00:00:00.000Z' } },
  saints: SAMPLE_SAINTS,
});
