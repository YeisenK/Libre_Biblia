import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { extractedDir, rawDir } from './paths';
import type { DownloadManifest, SourceSpec } from './types';

export const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

/**
 * Descarga los archivos de la fuente a raw/<CODE>/ y los extrae (los zip) a raw/<CODE>/extracted/.
 * Los datos descargados son NO confiables: solo se guardan y se leen como bytes/texto.
 */
export async function downloadSource(src: SourceSpec, force = false): Promise<DownloadManifest> {
  const dir = rawDir(src.code);
  mkdirSync(dir, { recursive: true });
  const manifestPath = join(dir, 'manifest.json');
  if (!force && existsSync(manifestPath)) {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as DownloadManifest;
    if (m.files.length === src.files.length && m.files.every((f) => existsSync(join(dir, f.name)))) {
      console.log(`[${src.code}] ya descargado (usa --force para repetir)`);
      ensureExtracted(src, m);
      return m;
    }
  }
  const manifest: DownloadManifest = { code: src.code, files: [] };
  for (const url of src.files) {
    const name = basename(new URL(url).pathname);
    console.log(`[${src.code}] descargando ${url}`);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(dir, name), buf);
    const hash = sha256(buf);
    manifest.files.push({ name, url, sha256: hash, bytes: buf.length, retrievedAt: new Date().toISOString() });
    console.log(`[${src.code}]   ${name}  ${buf.length} bytes  sha256=${hash}`);
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  ensureExtracted(src, manifest, true);
  return manifest;
}

function ensureExtracted(src: SourceSpec, m: DownloadManifest, fresh = false): void {
  const out = extractedDir(src.code);
  if (!fresh && existsSync(out) && readdirSync(out).length > 0) return;
  mkdirSync(out, { recursive: true });
  for (const f of m.files) {
    if (!f.name.endsWith('.zip')) continue;
    // execFile sin shell; unzip rechaza rutas con ".." por defecto. Solo extrae datos.
    execFileSync('unzip', ['-qo', join(rawDir(src.code), f.name), '-d', out], { stdio: 'inherit' });
  }
}

export function readManifest(code: string): DownloadManifest {
  return JSON.parse(readFileSync(join(rawDir(code), 'manifest.json'), 'utf8')) as DownloadManifest;
}
