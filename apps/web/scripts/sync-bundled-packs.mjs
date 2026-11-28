// Copia a public/packs/ los paquetes que van incluidos en la app (Biblias en español, Vulgata, voz Fraile)
// y genera public/packs/bundled.json (id, versión, bytes, sha256). Fuente: content/packs/ + content/catalog.json.
// Extensión `.pack`: Android descomprime y renombra los `.gz` de los assets, y eso rompería el sha256.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const out = join(root, 'apps', 'web', 'public', 'packs');

/** Orden = orden de instalación (la Biblia por defecto primero; la voz al final: es lo más pesado). */
export const BUNDLED = [
  { id: 'bible.BLL', group: 'bible' },
  { id: 'bible.SCIO', group: 'bible' },
  { id: 'bible.VULG', group: 'bible' },
  { id: 'audio.oraciones.fraile', group: 'voice' },
];

const catalog = JSON.parse(await readFile(join(root, 'content', 'catalog.json'), 'utf8'));
await mkdir(out, { recursive: true });
const packs = [];
for (const b of BUNDLED) {
  const e = catalog.packs.find((p) => p.id === b.id);
  if (!e) throw new Error(`No está en el catálogo: ${b.id}`);
  const src = join(root, 'content', e.url);
  const bytes = await readFile(src);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== e.sha256) throw new Error(`${b.id}: el archivo no coincide con el sha256 del catálogo (¿catálogo desactualizado?)`);
  const file = `${b.id}.pack`;
  await copyFile(src, join(out, file));
  packs.push({ id: e.id, kind: e.kind, group: b.group, title: e.title, version: e.version, file, bytes: bytes.length, sha256 });
}
await writeFile(join(out, 'bundled.json'), JSON.stringify({ format: 1, packs }, null, 2) + '\n');
console.log(`Incluidos: ${packs.map((p) => `${p.id} (${(p.bytes / 1e6).toFixed(2)} MB)`).join(', ')}`);
