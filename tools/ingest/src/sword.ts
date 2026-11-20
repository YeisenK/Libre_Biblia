/**
 * Lector de módulos SWORD zText (.bzs/.bzv/.bzz) para un testamento.
 * Soporta compresión LZSS (la de spasciont) y ZIP (zlib).
 * Solo lee y descomprime bytes; no interpreta ni ejecuta nada del módulo.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { KJV_NT } from './kjv-nt';
import { cleanThml } from './thml';
import type { CanonicalBible } from './types';

const N = 4096; // tamaño del anillo
const F = 18;
const THRESHOLD = 2; // coincidencia mínima = 3 bytes: copia (nibble + THRESHOLD + 1)

/** Descompresión LZSS de SWORD (Okumura). Flags LSB primero; bit 1 = literal. */
export function lzssDecode(src: Uint8Array, outLen: number): Buffer {
  const ring = Buffer.alloc(N, 0x20);
  let r = N - F;
  const out = Buffer.alloc(outLen);
  let o = 0;
  let i = 0;
  while (i < src.length && o < outLen) {
    let flags = src[i++]!;
    for (let b = 0; b < 8 && i < src.length && o < outLen; b++, flags >>= 1) {
      if (flags & 1) {
        const c = src[i++]!;
        out[o++] = c;
        ring[r] = c;
        r = (r + 1) & (N - 1);
      } else {
        if (i + 1 >= src.length) break;
        const a = src[i++]!;
        const c = src[i++]!;
        const pos = a | ((c & 0xf0) << 4);
        const len = (c & 0x0f) + THRESHOLD;
        for (let k = 0; k <= len && o < outLen; k++) {
          const ch = ring[(pos + k) & (N - 1)]!;
          out[o++] = ch;
          ring[r] = ch;
          r = (r + 1) & (N - 1);
        }
      }
    }
  }
  return out.subarray(0, o);
}

export interface SwordConf {
  compressType: string;
  versification: string;
  sourceType: string;
  encoding: string;
  dataPath: string;
  blockType: string;
}

export function parseConf(text: string): SwordConf {
  const get = (k: string) => new RegExp(`^${k}\\s*=\\s*(.*?)\\s*$`, 'mi').exec(text)?.[1] ?? '';
  return {
    compressType: get('CompressType').toUpperCase(),
    versification: get('Versification').toUpperCase() || 'KJV',
    sourceType: get('SourceType'),
    encoding: get('Encoding'),
    dataPath: get('DataPath'),
    blockType: get('BlockType').toUpperCase(),
  };
}

/** Devuelve todas las entradas del índice .bzv como texto crudo (sin limpiar). */
export interface ZTextEntries {
  entries: string[];
  /** Bloque de cada entrada (-1 si está vacía). */
  blockOf: number[];
}

export function readZTextEntries(dir: string, testament: 'ot' | 'nt', compress: string): ZTextEntries {
  const bzs = readFileSync(join(dir, `${testament}.bzs`));
  const bzz = readFileSync(join(dir, `${testament}.bzz`));
  const bzv = readFileSync(join(dir, `${testament}.bzv`));
  const blocks: Buffer[] = [];
  for (let i = 0; i + 12 <= bzs.length; i += 12) {
    const off = bzs.readUInt32LE(i);
    const size = bzs.readUInt32LE(i + 4);
    const usize = bzs.readUInt32LE(i + 8);
    const chunk = bzz.subarray(off, off + size);
    const data = compress === 'ZIP' ? inflateSync(chunk) : lzssDecode(chunk, usize);
    if (data.length !== usize) throw new Error(`Bloque ${i / 12}: tamaño descomprimido ${data.length} != ${usize}`);
    blocks.push(data);
  }
  const entries: string[] = [];
  const blockOf: number[] = [];
  for (let i = 0; i + 10 <= bzv.length; i += 10) {
    const b = bzv.readUInt32LE(i);
    const off = bzv.readUInt32LE(i + 4);
    const size = bzv.readUInt16LE(i + 8);
    const blk = blocks[b];
    if (size === 0) {
      entries.push('');
      blockOf.push(-1);
      continue;
    }
    if (!blk || off + size > blk.length) throw new Error(`Entrada ${i / 10} fuera de rango (bloque ${b})`);
    entries.push(blk.subarray(off, off + size).toString('utf8'));
    blockOf.push(b);
  }
  return { entries, blockOf };
}

/**
 * Convierte las entradas del NT (versificación KJV) a formato canónico.
 * Diseño del índice: 2 entradas iniciales (módulo y testamento), y por libro:
 * 1 cabecera de libro + por capítulo (1 cabecera + sus versículos).
 */
export function swordNtToCanonical(code: string, { entries, blockOf }: ZTextEntries): { bible: CanonicalBible; warnings: string[] } {
  const warnings: string[] = [];
  const expected = 2 + KJV_NT.reduce((a, [, ch]) => a + 1 + ch.length + ch.reduce((x, y) => x + y, 0), 0);
  if (entries.length !== expected) {
    throw new Error(`El índice tiene ${entries.length} entradas; la versificación KJV del NT requiere ${expected}`);
  }
  const bible: CanonicalBible = { code, books: {} };
  let idx = 2;
  for (const [osis, chapters] of KJV_NT) {
    const bookBlock = blockOf[idx];
    idx += 1; // cabecera de libro (descartada)
    const book: Record<string, [number, string][]> = {};
    chapters.forEach((count, ci) => {
      idx += 1; // cabecera/resumen de capítulo (descartada)
      const list: [number, string][] = [];
      for (let v = 1; v <= count; v++, idx++) {
        const text = cleanThml(entries[idx]!);
        list.push([v, text]);
        if (bookBlock !== undefined && bookBlock > 0 && blockOf[idx]! > 0 && blockOf[idx] !== bookBlock) {
          throw new Error(`${osis} ${ci + 1}:${v}: la entrada cae en otro bloque; desalineación del índice KJV`);
        }
      }
      book[String(ci + 1)] = list;
    });
    bible.books[osis] = book;
  }
  if (idx !== entries.length) throw new Error('Desalineación final del índice');
  return { bible, warnings };
}
