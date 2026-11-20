import { readFileSync } from 'node:fs';
import { SOURCES_FILE } from './paths';
import type { SourceSpec } from './types';

export function loadSources(only?: string[]): SourceSpec[] {
  const all = (JSON.parse(readFileSync(SOURCES_FILE, 'utf8')) as { sources: SourceSpec[] }).sources;
  if (!only || only.length === 0) return all;
  const wanted = only.map((s) => s.trim().toUpperCase()).filter(Boolean);
  const unknown = wanted.filter((c) => !all.some((s) => s.code === c));
  if (unknown.length) throw new Error(`Fuente(s) desconocida(s) en --only: ${unknown.join(', ')}`);
  return all.filter((s) => wanted.includes(s.code));
}
