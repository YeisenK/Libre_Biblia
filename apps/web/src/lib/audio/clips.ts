/**
 * Acceso a los clips de audio de oración instalados (paquetes `audio.oraciones.<voz>`).
 * La voz elegida es el id del paquete de audio (`settings.prayerVoice`).
 */
import { getDb, type AppDb, type AudioClipRow, type AudioPackRow } from '../db';

/** Voces instaladas (una por paquete de audio), ordenadas por nombre. */
export async function listVoices(db: AppDb = getDb()): Promise<AudioPackRow[]> {
  const rows = await db.audioPacks.toArray();
  return rows.sort((a, b) => a.voice.label.localeCompare(b.voice.label, 'es'));
}

/** Clip de una voz (id del paquete) por su clave: "prayer:padre-nuestro", "mystery:joyful-1:announce"… */
export async function getClip(packId: string, key: string, db: AppDb = getDb()): Promise<AudioClipRow | undefined> {
  return db.audioClips.get([packId, key]);
}

export async function hasClip(packId: string | null | undefined, key: string, db: AppDb = getDb()): Promise<boolean> {
  if (!packId) return false;
  return (await db.audioClips.where('[packId+key]').equals([packId, key]).count()) > 0;
}

/** Claves disponibles de una voz. */
export async function clipKeys(packId: string, db: AppDb = getDb()): Promise<string[]> {
  return (await db.audioClips.where('packId').equals(packId).primaryKeys()).map((k) => (k as [string, string])[1]);
}

// ── URL de objeto con recuento de usos ──
// Cada Blob se convierte en una URL `blob:` una sola vez mientras alguien la usa; al soltar el último uso se revoca.
const urls = new Map<string, { url: string; refs: number }>();

export interface ClipHandle {
  url: string;
  seconds: number;
  mime: string;
  /** Libera la URL (idempotente). Hay que llamarla al terminar de usar el clip. */
  release: () => void;
}

export async function openClip(packId: string, key: string, db: AppDb = getDb()): Promise<ClipHandle | null> {
  const row = await getClip(packId, key, db);
  if (!row) return null;
  const id = `${packId}\u0000${key}`;
  let e = urls.get(id);
  if (!e) {
    e = { url: URL.createObjectURL(row.blob), refs: 0 };
    urls.set(id, e);
  }
  e.refs++;
  let done = false;
  return {
    url: e.url,
    seconds: row.seconds,
    mime: row.mime,
    release: () => {
      if (done) return;
      done = true;
      const cur = urls.get(id);
      if (!cur || --cur.refs > 0) return;
      urls.delete(id);
      URL.revokeObjectURL(cur.url);
    },
  };
}

/** Para pruebas: URL de objeto vivas. */
export const openUrlCount = () => urls.size;
