import { join, resolve } from 'node:path';

/** Raíz del paquete @bc/ingest. */
export const PKG_ROOT = resolve(__dirname, '..');
export const RAW_DIR = join(PKG_ROOT, 'raw');
export const OUT_DIR = join(PKG_ROOT, 'out');
export const SOURCES_FILE = join(PKG_ROOT, 'sources.json');

export const rawDir = (code: string) => join(RAW_DIR, code);
/** Directorio donde se extraen los zip (dentro de raw/<CODE>/). */
export const extractedDir = (code: string) => join(RAW_DIR, code, 'extracted');
export const outFile = (code: string) => join(OUT_DIR, `${code}.json`);
export const reportFile = (code: string) => join(OUT_DIR, `${code}.report.json`);
export const convertLogFile = (code: string) => join(OUT_DIR, `${code}.convert.json`);

/** Repositorio de contenido (carpeta `content/` en la raíz del monorepo). */
export const CONTENT_DIR = join(PKG_ROOT, '..', '..', 'content');
export const PACKS_DIR = join(CONTENT_DIR, 'packs');
export const CATALOG_FILE = join(CONTENT_DIR, 'catalog.json');
