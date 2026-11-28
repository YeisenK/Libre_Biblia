/**
 * Devociones por santo o advocación: agrupa novenas y oraciones por el campo `saints`
 * (ids del santoral cuando existen; si no, un id propio en kebab-case).
 */
import type { Novena, Prayer } from '@bc/shared';
import type { PrayerCatalog } from './catalog';

export interface SaintDevotion {
  id: string;
  novenas: Novena[];
  prayers: Prayer[];
}

/** Patronazgos documentados de los santos del catálogo de devociones (sin promesas no documentadas). */
export const SAINT_PATRONAGE: Record<string, { name: string; patronage: string }> = {
  'san-jose': { name: 'San José', patronage: 'Patrono de la Iglesia universal (Pío IX, 1870), de los trabajadores (Pío XII, 1955), de las familias y de la buena muerte (tradición).' },
  'san-miguel-arcangel': { name: 'San Miguel arcángel', patronage: 'Defensor del pueblo de Dios (Dn 12,1; Ap 12,7); invocado en la lucha contra el mal. Patrono de la Iglesia universal (tradición).' },
  'san-rafael-arcangel': { name: 'San Rafael arcángel', patronage: 'Compañero de camino de Tobías (Tb 5-12); invocado por los caminantes, los enfermos y los novios.' },
  'san-gabriel-arcangel': { name: 'San Gabriel arcángel', patronage: 'Mensajero de la Anunciación (Lc 1,26-38); invocado por quienes comunican y anuncian.' },
  'maria-goretti': { name: 'Santa María Goretti', patronage: 'Mártir de la pureza (canonizada en 1950); patrona de la juventud y de las víctimas de violencia.' },
  'tomas-de-aquino': { name: 'Santo Tomás de Aquino', patronage: 'Doctor de la Iglesia; patrono de los estudiantes y de las escuelas católicas (León XIII, 1880).' },
  'benito-de-nursia': { name: 'San Benito de Nursia', patronage: 'Patrono de Europa (Pablo VI, 1964); padre del monacato occidental.' },
  'antonio-de-padua': { name: 'San Antonio de Padua', patronage: 'Doctor evangélico; predicador. La tradición popular le invoca por las cosas perdidas.' },
  'santa-rita-de-casia': { name: 'Santa Rita de Casia', patronage: 'Esposa, madre, viuda y religiosa agustina (†1457); invocada por la paz en las familias y por los casos difíciles.' },
  'judas-tadeo': { name: 'San Judas Tadeo', patronage: 'Apóstol, autor de la carta de Judas; invocado en las causas difíciles (devoción popular).' },
  'monica-de-hipona': { name: 'Santa Mónica', patronage: 'Madre de san Agustín; modelo de oración perseverante por los hijos y patrona de las madres.' },
  'francisco-de-sales': { name: 'San Francisco de Sales', patronage: 'Doctor de la Iglesia; patrono de los periodistas y escritores (Pío XI, 1923); maestro de la dulzura y la vida devota.' },
  'agustin-de-hipona': { name: 'San Agustín', patronage: 'Obispo y doctor de la Iglesia; maestro de la conversión y de la búsqueda de Dios.' },
  'ignacio-de-loyola': { name: 'San Ignacio de Loyola', patronage: 'Fundador de la Compañía de Jesús; maestro del discernimiento (Ejercicios espirituales).' },
  'joaquin-y-ana': { name: 'San Joaquín y santa Ana', patronage: 'Padres de la Virgen María (tradición del Protoevangelio de Santiago); patronos de los abuelos.' },
  'angeles-custodios': { name: 'Santos Ángeles Custodios', patronage: 'Protección y guía de cada persona (CIC 336).' },
  'margarita-maria-alacoque': { name: 'Santa Margarita María Alacoque', patronage: 'Visitandina de Paray-le-Monial; difundió la devoción al Sagrado Corazón.' },
  'luis-maria-grignion-de-montfort': { name: 'San Luis María Grignion de Montfort', patronage: 'Maestro de la espiritualidad mariana (Tratado de la verdadera devoción).' },
  'teresa-del-nino-jesus': { name: 'Santa Teresa del Niño Jesús', patronage: 'Doctora de la Iglesia; patrona de las misiones (Pío XI, 1927).' },
  'francisco-de-asis': { name: 'San Francisco de Asís', patronage: 'Patrono de Italia y de los ecologistas (Juan Pablo II, 1979).' },
  'faustina-kowalska': { name: 'Santa Faustina Kowalska', patronage: 'Apóstol de la Divina Misericordia.' },
  'rosa-de-lima': { name: 'Santa Rosa de Lima', patronage: 'Primera santa de América; patrona de América Latina y de Filipinas.' },
};

export const saintLabel = (id: string, saintName?: string): string =>
  SAINT_PATRONAGE[id]?.name ?? saintName ?? id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Agrupa por santo/advocación todo lo que declara `saints`. Orden alfabético. */
export function devotionsBySaint(cat: Pick<PrayerCatalog, 'novenas' | 'prayers'>, nameOf: (id: string) => string = (id) => saintLabel(id)): SaintDevotion[] {
  const map = new Map<string, SaintDevotion>();
  const get = (id: string) => {
    let d = map.get(id);
    if (!d) map.set(id, (d = { id, novenas: [], prayers: [] }));
    return d;
  };
  for (const n of cat.novenas) for (const s of n.saints ?? []) get(s).novenas.push(n);
  for (const p of cat.prayers) for (const s of p.saints ?? []) get(s).prayers.push(p);
  return [...map.values()].sort((a, b) => nameOf(a.id).localeCompare(nameOf(b.id), 'es'));
}

/** Novenas con fiesta (fija o móvil) que comparten santo con el elemento dado. */
export function relatedFeastNovenas(cat: Pick<PrayerCatalog, 'novenas'>, saints: string[] | undefined, excludeId?: string): Novena[] {
  if (!saints?.length) return [];
  return cat.novenas.filter((n) => n.id !== excludeId && n.feast && n.saints?.some((s) => saints.includes(s)));
}
