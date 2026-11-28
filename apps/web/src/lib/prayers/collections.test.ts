import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb } from '../db';
import { addToCollection, collectionsWith, createCollection, deleteCollection, isPrayerKey, listCollections, moveInCollection, removeFromCollection, renameCollection } from './collections';
import { novenaShareText, plainForShare, prayerShareText } from './share';
import type { Novena, Prayer } from '@bc/shared';

let n = 0;
let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-collections-${n++}`);
});

describe('colecciones de oraciones', () => {
  it('crea, renombra, ordena por nombre y borra', async () => {
    const b = await createCollection('  Zeta ', ['prayer:ave-maria', 'prayer:ave-maria', 'cosa:mala'], db);
    const a = await createCollection('Alfa', [], db);
    expect(b.title).toBe('Zeta');
    expect(b.items).toEqual(['prayer:ave-maria']);
    expect((await listCollections(db)).map((c) => c.id)).toEqual([a.id, b.id]);
    await renameCollection(a.id, 'Mañanas', db);
    await renameCollection(a.id, '   ', db);
    expect((await listCollections(db))[0]!.title).toBe('Mañanas');
    await deleteCollection(b.id, db);
    expect(await listCollections(db)).toHaveLength(1);
  });

  it('añade sin duplicar, valida claves, quita y mueve', async () => {
    const c = await createCollection('C', [], db);
    expect(await addToCollection(c.id, 'prayer:a', db)).toBe(true);
    expect(await addToCollection(c.id, 'prayer:a', db)).toBe(false);
    expect(await addToCollection(c.id, 'rosary', db)).toBe(false);
    await addToCollection(c.id, 'novena:n', db);
    await addToCollection(c.id, 'prayer:b', db);
    await moveInCollection(c.id, 'prayer:b', -1, db);
    await moveInCollection(c.id, 'prayer:a', -1, db);
    expect((await listCollections(db))[0]!.items).toEqual(['prayer:a', 'prayer:b', 'novena:n']);
    await removeFromCollection(c.id, 'prayer:b', db);
    expect(await collectionsWith('prayer:a', db)).toEqual([c.id]);
    expect(await collectionsWith('prayer:b', db)).toEqual([]);
  });

  it('ignora las colecciones de otros tipos', async () => {
    await db.userCollections.put({ id: 'x', kind: 'art', title: 'Arte', items: [], createdAt: '', updatedAt: '' });
    expect(await listCollections(db)).toEqual([]);
  });

  it('reconoce claves válidas', () => {
    expect(isPrayerKey('prayer:ante-studium')).toBe(true);
    expect(isPrayerKey('novena:san-jose')).toBe(true);
    expect(isPrayerKey('gospel')).toBe(false);
  });
});

describe('compartir', () => {
  const p = { id: 'x', title: 'Por la paciencia', categories: ['c'], nature: 'original', text: '**Señor**, dame *paciencia*.\n> Amén.', attribution: 'Composición de Lux' } as Prayer;
  it('conserva el rótulo de composición propia y quita Markdown', () => {
    const t = prayerShareText(p);
    expect(t).toContain('Composición de Lux');
    expect(t).not.toContain('**');
    expect(t).toContain('Señor, dame paciencia.');
    expect(plainForShare('> cita')).toBe('cita');
  });
  it('resume una novena con la intención', () => {
    const nv = { id: 'n', title: 'Novena', nature: 'original', description: 'Desc', days: [{ day: 1, title: 'Uno', reading: 'Mt 1,1', reflection: 'r', prayer: 'p' }] } as Novena;
    const t = novenaShareText(nv, ' por mi familia ');
    expect(t).toContain('Mi intención: por mi familia');
    expect(t).toContain('Día 1: Uno (Mt 1,1)');
  });
});
