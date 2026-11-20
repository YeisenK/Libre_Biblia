import { assertPack, type CatalogEntry, type ContentPack } from '@bc/shared';

export const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return toHex(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
}

export async function verifySha256(data: ArrayBuffer | Uint8Array, expected: string) {
  const got = await sha256Hex(data);
  if (got !== expected.trim().toLowerCase()) throw new Error('La verificación sha256 falló: el archivo está dañado o fue alterado');
}

export const isGzip = (b: Uint8Array) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

/** Descomprime gzip con DecompressionStream; si no es gzip, devuelve el texto tal cual. */
export async function gunzipToText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!isGzip(bytes)) return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  void writer.write(bytes as BufferSource).then(() => writer.close());
  return new Response(ds.readable).text();
}

export function parsePack(text: string): ContentPack {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('El paquete no es JSON válido');
  }
  assertPack(json);
  return json;
}

export function resolvePackUrl(catalogUrl: string, entryUrl: string): string {
  return new URL(entryUrl, catalogUrl).toString();
}

export interface DownloadOptions {
  fetchImpl?: typeof fetch;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Descarga, verifica sha256, descomprime y valida un paquete del catálogo. */
export async function downloadPack(entry: CatalogEntry, catalogUrl: string, opts: DownloadOptions = {}): Promise<ContentPack> {
  const f = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const res = await f(resolvePackUrl(catalogUrl, entry.url), { signal: opts.signal });
  if (!res.ok) throw new Error(`No se pudo descargar "${entry.title}" (${res.status})`);
  const total = Number(res.headers.get('content-length')) || entry.bytes || 0;
  let buf: Uint8Array;
  if (res.body) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (total) opts.onProgress?.(Math.min(0.99, got / total));
    }
    buf = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) (buf.set(c, o), (o += c.length));
  } else buf = new Uint8Array(await res.arrayBuffer());
  await verifySha256(buf, entry.sha256);
  const pack = parsePack(await gunzipToText(buf));
  if (pack.id !== entry.id) throw new Error(`El paquete descargado (${pack.id}) no corresponde a ${entry.id}`);
  return pack;
}
