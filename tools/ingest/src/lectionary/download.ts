/**
 * Descarga las REFERENCIAS de las lecturas de la Misa desde la API pública de Evangelizo
 * (https://publication.evangelizo.ws/SP/days/AAAA-MM-DD/readings).
 *
 * - Guarda solo referencias (código de cita y tipo), nunca el texto ni los comentarios.
 * - Una petición por fecha (caché en raw/evangelizo/AAAA-MM-DD.json) y como mucho 1 por segundo.
 * - Si responde 429/403 o devuelve algo que no es JSON (desafío anti-bot) se detiene sin reintentar.
 *
 * Uso: tsx src/lectionary/download.ts [desde=2017-12-03] [hasta=2026-11-28]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAW_DIR } from '../paths';

export const EVANGELIZO_DIR = join(RAW_DIR, 'evangelizo');
const UA = 'LibreBiblia-ingest/0.1 (+https://github.com/YeisenK/Libre_Biblia)';
const MIN_GAP_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000;
const iso = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
const dn = (s: string) => Math.round(Date.parse(`${s}T00:00:00Z`) / DAY);

interface ApiReading {
  reading_code: string;
  type: string;
  reference_displayed?: string;
  book?: { code?: string };
}

async function main() {
  const from = process.argv[2] ?? '2017-12-03';
  const to = process.argv[3] ?? '2026-11-28';
  mkdirSync(EVANGELIZO_DIR, { recursive: true });
  let last = 0;
  let done = 0;
  let skipped = 0;
  for (let n = dn(from); n <= dn(to); n++) {
    const date = iso(n);
    const file = join(EVANGELIZO_DIR, `${date}.json`);
    if (existsSync(file)) {
      skipped++;
      continue;
    }
    const wait = last + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(`https://publication.evangelizo.ws/SP/days/${date}/readings`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (res.status === 429 || res.status === 403) {
      console.error(`PARADA: HTTP ${res.status} en ${date}. No se reintenta (retry-after: ${res.headers.get('retry-after')}).`);
      process.exit(2);
    }
    const body = await res.text();
    let json: { data?: ApiReading[] };
    try {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = JSON.parse(body);
      if (!Array.isArray(json.data)) throw new Error('sin data');
    } catch (e) {
      console.error(`PARADA: respuesta no válida en ${date} (${res.status} ${res.headers.get('content-type')}): ${(e as Error).message}`);
      process.exit(3);
    }
    const slim = json.data!.map((r) => ({
      code: r.reading_code,
      type: r.type,
      shown: r.reference_displayed ?? null,
      book: r.book?.code ?? null,
    }));
    writeFileSync(file, JSON.stringify({ date, fetchedAt: new Date().toISOString(), readings: slim }) + '\n');
    done++;
    if (done % 50 === 0) console.log(`${date} descargadas=${done} en caché=${skipped}`);
    // Respeta la cabecera de límite de tasa
    const remaining = Number(res.headers.get('ratelimit-remaining') ?? res.headers.get('x-ratelimit-remaining-minute') ?? '99');
    if (remaining <= 1) await sleep(Number(res.headers.get('ratelimit-reset') ?? 1) * 1000 + 500);
  }
  console.log(`FIN descargadas=${done} en caché=${skipped}`);
}
if (require.main === module) void main();
