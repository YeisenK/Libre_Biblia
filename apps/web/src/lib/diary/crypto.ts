/**
 * Cifrado del diario en la copia de seguridad: PBKDF2-SHA-256 (≥ 200 000 iteraciones) + AES-GCM 256.
 * Sal e IV aleatorios por copia. La contraseña la elige el usuario y no se guarda en ningún sitio.
 */
import type { DiaryEntryRow } from '../db';
import { isDiaryDate, isDiaryKind } from './model';

export const DIARY_ENVELOPE_FORMAT = 'biblia-diario-cifrado';
export const DIARY_ENVELOPE_VERSION = 1;
export const PBKDF2_ITERATIONS = 200_000;
export const MIN_DIARY_PASSWORD = 8;
const MAX_ITERATIONS = 5_000_000;

/** Sobre cifrado que va dentro de la copia (campo `diary`). */
export interface DiaryEnvelope {
  format: typeof DIARY_ENVELOPE_FORMAT;
  v: number;
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  /** base64 de 16 bytes aleatorios */
  salt: string;
  /** base64 de 12 bytes aleatorios */
  iv: string;
  /** base64 del JSON cifrado con AES-GCM (incluye la etiqueta de autenticación) */
  data: string;
}

export const WRONG_PASSWORD = 'Contraseña incorrecta o copia dañada.';

const te = new TextEncoder();
const td = new TextDecoder();

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Este navegador no permite cifrar la copia.');
  return s;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Cifra las entradas con la contraseña indicada. Lanza si la contraseña es demasiado corta. */
export async function encryptDiary(entries: DiaryEntryRow[], password: string, iterations = PBKDF2_ITERATIONS): Promise<DiaryEnvelope> {
  if (password.length < MIN_DIARY_PASSWORD) throw new Error(`La contraseña del diario debe tener al menos ${MIN_DIARY_PASSWORD} caracteres.`);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, te.encode(JSON.stringify(entries)));
  return {
    format: DIARY_ENVELOPE_FORMAT,
    v: DIARY_ENVELOPE_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    data: bytesToB64(new Uint8Array(ct)),
  };
}

export function isDiaryEnvelope(x: unknown): x is DiaryEnvelope {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return e.format === DIARY_ENVELOPE_FORMAT && typeof e.salt === 'string' && typeof e.iv === 'string' && typeof e.data === 'string' && typeof e.iterations === 'number';
}

/** Descifra el sobre. Contraseña incorrecta o datos alterados → Error con mensaje limpio, sin escribir nada. */
export async function decryptDiary(env: DiaryEnvelope, password: string): Promise<DiaryEntryRow[]> {
  if (!isDiaryEnvelope(env) || env.kdf !== 'PBKDF2-SHA-256') throw new Error('El diario de la copia no tiene un formato válido.');
  if (!Number.isInteger(env.iterations) || env.iterations < PBKDF2_ITERATIONS || env.iterations > MAX_ITERATIONS) throw new Error('El diario de la copia usa un cifrado no soportado.');
  let plain: string;
  try {
    const key = await deriveKey(password, b64ToBytes(env.salt), env.iterations);
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: b64ToBytes(env.iv) as BufferSource }, key, b64ToBytes(env.data) as BufferSource);
    plain = td.decode(pt);
  } catch {
    throw new Error(WRONG_PASSWORD);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(plain);
  } catch {
    throw new Error(WRONG_PASSWORD);
  }
  if (!Array.isArray(raw)) throw new Error('El diario de la copia no tiene un formato válido.');
  return raw.filter(isEntry);
}

const isEntry = (x: unknown): x is DiaryEntryRow => {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return typeof e.id === 'string' && e.id.length > 0 && isDiaryDate(e.date) && isDiaryKind(e.kind) && typeof e.text === 'string' && typeof e.createdAt === 'string' && typeof e.updatedAt === 'string';
};
