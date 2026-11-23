/** Utilidades de presentación de los elementos de rutina (`prayer:<id>`, `novena:<id>`, `rosary`, `gospel`, `verse`). */
export function itemIcon(key: string): string {
  if (key === 'rosary') return 'rosary';
  if (key === 'gospel') return 'book';
  if (key === 'verse') return 'dove';
  if (key.startsWith('novena:')) return 'candle';
  return 'hands';
}

export const DAY_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAY_NAME = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** «Lun a vie», «Todos los días», «Lun, mié»… */
export function daysLabel(days: number[]): string {
  const d = [...new Set(days)].sort((a, b) => a - b);
  if (d.length === 7) return 'Todos los días';
  if (d.length === 0) return 'Ningún día';
  if (d.join() === '1,2,3,4,5') return 'De lunes a viernes';
  if (d.join() === '0,6') return 'Fines de semana';
  return d.map((x) => DAY_LABEL[x]).join(', ');
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
