import { describe, expect, it } from 'vitest';
import { destinationOf } from './AppShell';

describe('destino activo de la navegación', () => {
  it('asigna cada ruta a su destino', () => {
    expect(destinationOf('/')).toBe('inicio');
    for (const p of ['/orar/', '/oracion/', '/oraciones/', '/novena/', '/novenas/', '/rutina/', '/rutinas/', '/rosario/', '/rosario/historial/']) expect(destinationOf(p)).toBe('orar');
    for (const p of ['/leer/', '/comparar/', '/buscar/']) expect(destinationOf(p)).toBe('biblia');
    for (const p of ['/biblioteca/', '/documento/']) expect(destinationOf(p)).toBe('biblioteca');
    for (const p of ['/mas/', '/ajustes/', '/descargas/', '/marcadores/', '/fuentes/']) expect(destinationOf(p)).toBe('mas');
    expect(destinationOf('/hoy/')).toBe('inicio');
  });
});
