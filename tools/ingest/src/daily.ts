/**
 * Ciclo temático del versículo diario: parser de los .md de `sources/daily/`,
 * validador, cotejo con la Biblia SBLM (`daily check`) y empaquetado como borrador (`daily pack`).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { PACK_FORMAT_VERSION, assertPack, parseReference, type Catalog, type CatalogEntry, type DailyEntry, type DailyPack } from '@bc/shared';
import { writePack } from './catalog';
import { CONTENT_DIR, PACKS_DIR, PKG_ROOT } from './paths';

export const DAILY_DIR = join(PKG_ROOT, 'sources', 'daily');
export const DAILY_FILES = ['ciclo-01-mar.md', 'ciclo-04-jun.md', 'ciclo-07-sep.md', 'ciclo-10-dic.md'];
export const DRAFTS_DIR = join(CONTENT_DIR, 'drafts');
export const DAILY_ID = 'daily.ciclo-tematico';

export interface ParsedDaily extends DailyEntry { file?: string }

const wc = (s: string) => (s.match(/\S+/g) ?? []).length;

/** Parsea un .md del ciclo. Lanza error con la fecha ante entradas mal formadas. */
export function parseDailyMarkdown(md: string, file?: string): ParsedDaily[] {
  const out: ParsedDaily[] = [];
  const parts = md.replace(/\r\n/g, '\n').split(/^## (?=\d{2}-\d{2} · )/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const head = part.slice(0, nl);
    const hm = /^(\d{2}-\d{2}) · (.+)$/.exec(head.trim());
    if (!hm) throw new Error(`Encabezado inválido: ${head}`);
    const date = hm[1]!;
    const body = part.slice(nl + 1);
    const where = `${file ?? '?'} ${date}`;
    const [meta, ...secs] = body.split(/^### /m);
    const field = (k: string) => {
      const m = new RegExp(`^- ${k}:[ \\t]*(.+)$`, 'm').exec(meta!);
      if (!m) throw new Error(`${where}: falta «${k}»`);
      return m[1]!.trim();
    };
    const section = (name: string) => {
      const s = secs.find((x) => x.startsWith(name + '\n'));
      if (!s) throw new Error(`${where}: falta sección «${name}»`);
      return s.slice(name.length + 1).replace(/\n---\s*$/, '').trim();
    };
    const questions = section('Para meditar').split('\n').map((l) => /^\d+\.\s+(.+)$/.exec(l.trim())?.[1]).filter((x): x is string => !!x);
    out.push({
      date, title: hm[2]!.trim(), theme: field('Tema'), ref: field('Cita'), psalmNumbering: 'hebrew',
      related: field('Relacionadas').split(';').map((s) => s.trim()).filter(Boolean),
      context: section('Contexto'), reflection: section('Reflexión'), questions, prayer: section('Oración'), file,
    });
  }
  return out;
}

export function loadDailyEntries(dir = DAILY_DIR, files = DAILY_FILES): ParsedDaily[] {
  return files.flatMap((f) => parseDailyMarkdown(readFileSync(join(dir, f), 'utf8'), f));
}

/** Los 366 días «MM-DD» del año bisiesto. */
export function allDates(): string[] {
  const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dim.flatMap((n, m) => Array.from({ length: n }, (_, d) => `${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`));
}

/** Validación estructural y editorial; devuelve la lista de errores (vacía si todo bien). */
export function validateDaily(entries: DailyEntry[], opts: { strictWords?: boolean } = {}): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  const dates = new Set(allDates());
  for (const e of entries) {
    if (!dates.has(e.date)) errs.push(`${e.date}: fecha no válida`);
    if (seen.has(e.date)) errs.push(`${e.date}: fecha duplicada`);
    seen.add(e.date);
    for (const k of ['title', 'theme', 'ref', 'context', 'reflection', 'prayer'] as const) if (!e[k]?.trim()) errs.push(`${e.date}: «${k}» vacío`);
    if (e.questions.length < 2 || e.questions.length > 3) errs.push(`${e.date}: ${e.questions.length} preguntas (deben ser 2–3)`);
    if (e.related.length < 1 || e.related.length > 3) errs.push(`${e.date}: ${e.related.length} relacionadas (1–3)`);
    if (opts.strictWords) {
      const r = wc(e.reflection), p = wc(e.prayer);
      if (r < 80 || r > 140) errs.push(`${e.date}: reflexión de ${r} palabras (80–140)`);
      if (p < 30 || p > 70) errs.push(`${e.date}: oración de ${p} palabras (30–70)`);
      if (!/Amén\.?\s*$/.test(e.prayer)) errs.push(`${e.date}: la oración no termina en «Amén»`);
    }
  }
  for (const d of dates) if (!seen.has(d)) errs.push(`${d}: falta la fecha`);
  const byRef = new Map<string, string[]>();
  for (const e of entries) byRef.set(e.ref, [...(byRef.get(e.ref) ?? []), e.date]);
  for (const [r, ds] of byRef) if (ds.length > 1) errs.push(`Cita repetida «${r}»: ${ds.join(', ')}`);
  return errs;
}

type Bible = Record<string, Record<string, [number, string][]>>;
export function loadBible(code: string): Bible {
  const p = JSON.parse(gunzipSync(readFileSync(join(PACKS_DIR, `bible.${code}.json.gz`))).toString('utf8'));
  return p.books as Bible;
}

/** Texto de una referencia en una Biblia; error si no existe algún capítulo/versículo. */
export function refText(bible: Bible, ref: string): { text: string; error?: string } {
  let r;
  try { r = parseReference(ref); } catch (e) { return { text: '', error: (e as Error).message }; }
  const book = bible[r.book];
  if (!book) return { text: '', error: `libro ${r.book} ausente` };
  const c1 = r.chapter, c2 = r.chapterEnd ?? r.chapter;
  const parts: string[] = [];
  for (let c = c1; c <= c2; c++) {
    const ch = book[String(c)];
    if (!ch) return { text: '', error: `capítulo ${c} inexistente` };
    const max = ch[ch.length - 1]![0];
    const v1 = c === c1 ? (r.verseStart ?? 1) : 1;
    const v2 = c === c2 ? (r.verseEnd ?? max) : max;
    if (v2 > max || v1 < 1) return { text: '', error: `versículo ${c},${v2} fuera de rango (máx. ${max})` };
    for (const [n, t] of ch) if (n >= v1 && n <= v2) parts.push(`${c2 !== c1 ? c + ',' : ''}${n} ${t}`);
    if (!parts.length) return { text: '', error: `sin versículos en ${c},${v1}-${v2}` };
  }
  return { text: parts.join(' ') };
}

const firstSentence = (s: string) => (/^.+?[.!?](?=\s|$)/s.exec(s)?.[0] ?? s).replace(/\s+/g, ' ');

/** `daily check`: informe por bloques; devuelve nº de errores. */
export function runCheck(opts: { from?: string; to?: string; quiet?: boolean } = {}): number {
  const entries = loadDailyEntries();
  const sblm = loadBible('SBLM');
  let nerr = 0;
  for (const e of entries) {
    if ((opts.from && e.date < opts.from) || (opts.to && e.date > opts.to)) continue;
    const main = refText(sblm, e.ref);
    const rel = e.related.map((r) => ({ r, ...refText(sblm, r) }));
    const bad = [main.error ? `Cita ${e.ref}: ${main.error}` : '', ...rel.filter((x) => x.error).map((x) => `Relacionada ${x.r}: ${x.error}`)].filter(Boolean);
    nerr += bad.length;
    if (opts.quiet && !bad.length) continue;
    console.log(`\n## ${e.date} · ${e.title}\nTema: ${e.theme}\nCita: ${e.ref}  | Rel: ${e.related.join('; ')}`);
    for (const b of bad) console.log(`  !! ERROR ${b}`);
    if (!main.error) console.log(`  TEXTO: ${main.text}`);
    console.log(`  REFL: ${firstSentence(e.reflection)}`);
  }
  const verr = validateDaily(entries, { strictWords: true });
  for (const v of verr) console.log(`  !! VALIDACIÓN ${v}`);
  nerr += verr.length;
  console.log(`\n${entries.length} entradas; ${nerr} errores.`);
  return nerr;
}

export const DAILY_PROVENANCE = 'https://github.com/YeisenK/Libre_Biblia/tree/main/tools/ingest/sources/daily';

export function buildDailyPack(entries: DailyEntry[], originalSha256: string, retrievedAt: string): DailyPack {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((e): DailyEntry => ({
    date: e.date, title: e.title, theme: e.theme, ref: e.ref, psalmNumbering: 'hebrew', related: e.related,
    context: e.context, reflection: e.reflection, questions: e.questions, prayer: e.prayer,
  }));
  return {
    format: PACK_FORMAT_VERSION, kind: 'daily', id: DAILY_ID, version: retrievedAt.slice(0, 10).replace(/-/g, '.'),
    meta: {
      title: 'Ciclo temático — versículo del día',
      description: 'Un pasaje bíblico para cada día del año (366), con contexto, reflexión, preguntas para meditar y oración. Borrador editorial pendiente de revisión; contenido devocional, no Magisterio.',
      authority: 'devotional', language: 'es', status: 'draft',
      source: {
        name: 'Libre Biblia — ciclo temático (borrador editorial)', license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', provenanceUrl: DAILY_PROVENANCE, originalSha256, retrievedAt,
      },
    },
    entries: sorted,
  };
}

export function runPack(): { bytes: number; sha256: string; file: string } {
  const entries = loadDailyEntries();
  const errs = validateDaily(entries, { strictWords: true });
  if (errs.length) throw new Error('Validación con errores:\n' + errs.join('\n'));
  const concat = DAILY_FILES.map((f) => readFileSync(join(DAILY_DIR, f))).reduce((h, b) => h.update(b), createHash('sha256')).digest('hex');
  // Fecha de obtención determinista: se conserva la del catálogo si el contenido no cambió.
  const catFile = join(DRAFTS_DIR, 'catalog.json');
  let retrievedAt = new Date().toISOString();
  try {
    const prev = JSON.parse(readFileSync(catFile, 'utf8')) as Catalog;
    const p = prev.packs.find((x) => x.id === DAILY_ID);
    if (p && p.source.originalSha256 === concat) retrievedAt = p.source.retrievedAt;
  } catch { /* primera vez */ }
  const pack = buildDailyPack(entries, concat, retrievedAt);
  assertPack(JSON.parse(JSON.stringify(pack)));
  const w = writePack(DAILY_ID, pack, join(DRAFTS_DIR, 'packs'));
  const entry: CatalogEntry = {
    id: pack.id, kind: 'daily', version: pack.version, title: pack.meta.title, description: pack.meta.description,
    language: 'es', url: `packs/${w.file}`, bytes: w.bytes, sha256: w.sha256, authority: 'devotional', collection: 'Versículo del día', source: pack.meta.source,
  };
  const cat: Catalog = {
    format: PACK_FORMAT_VERSION, name: 'Libre Biblia — borradores (no revisados)',
    description: 'Contenido editorial en borrador pendiente de revisión. No es el repositorio oficial.',
    homepage: 'https://github.com/YeisenK/Libre_Biblia', updatedAt: retrievedAt, packs: [entry],
  };
  mkdirSync(DRAFTS_DIR, { recursive: true });
  writeFileSync(catFile, JSON.stringify(cat, null, 2) + '\n');
  return w;
}
