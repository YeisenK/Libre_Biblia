/**
 * Consolida las referencias descargadas de Evangelizo por clave de día litúrgico.
 *
 * Lee raw/evangelizo/*.json, normaliza las citas, agrupa por clave (packages/shared/src/lectionary/keys.ts),
 * decide el consenso de cada clave, valida las citas contra SBLM/DRA y escribe:
 *   - packages/shared/src/lectionary/data.json
 *   - tools/ingest/out/lectionary-report.json
 *
 * Uso: tsx src/lectionary/consolidate.ts [--options=eaCc] [--detect]   (--detect compara las 8 combinaciones de opciones)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { convertRef, liturgicalDay, normalizeEvangelizoCode, type BibleRef, type LiturgyOptions } from '@bc/shared';
import { lectionaryLookup } from '@bc/shared';
import { CONTENT_DIR, OUT_DIR, RAW_DIR } from '../paths';
const EVANGELIZO_DIR = join(RAW_DIR, 'evangelizo');

type Type = 'first' | 'psalm' | 'second' | 'gospel';
const LETTER: Record<Type, string> = { first: '1', psalm: 'P', second: '2', gospel: 'G' };

interface Reading { type: Type; ref: string; segments: BibleRef[] }
interface DayRec { date: string; readings: Reading[]; lastVerseNotes: string[]; letters: boolean }

// ---------- packs para validar y para unir capítulos contiguos ----------
type Pack = Record<string, Record<string, [number, string][]>>;
const loadPack = (code: string): Pack => JSON.parse(gunzipSync(readFileSync(join(CONTENT_DIR, 'packs', `bible.${code}.json.gz`))).toString()).books;
const SBLM = loadPack('SBLM');
const DRA = loadPack('DRA');
const lastVerseOf = (pack: Pack, book: string, ch: number): number | undefined => {
  const v = pack[book]?.[String(ch)];
  return v?.length ? Math.max(...v.map((x) => x[0])) : undefined;
};

/** Une «Mc 14,1-72#Mc 15,1-47» (capítulos consecutivos, el 1.º llega a su último versículo) en un único tramo. */
function joinChapters(segs: BibleRef[]): BibleRef[] {
  const out: BibleRef[] = [];
  for (const s of segs) {
    const p = out[out.length - 1];
    if (p && p.book === s.book && p.verseStart !== undefined && s.verseStart === 1 && !s.chapterEnd) {
      const pc = p.chapterEnd ?? p.chapter;
      const pv = p.verseEnd ?? p.verseStart;
      if (s.chapter === pc + 1 && lastVerseOf(SBLM, p.book, pc) === pv) {
        p.chapterEnd = s.chapter;
        p.verseEnd = s.verseEnd ?? 1;
        continue;
      }
    }
    out.push({ ...s });
  }
  return out;
}

function loadDays(): { days: DayRec[]; problems: string[] } {
  const problems: string[] = [];
  const days: DayRec[] = [];
  for (const f of readdirSync(EVANGELIZO_DIR).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort()) {
    const j = JSON.parse(readFileSync(join(EVANGELIZO_DIR, f), 'utf8')) as { date: string; readings: { code: string; type: string }[] };
    const readings: Reading[] = [];
    let readingN = 0;
    let letters = false;
    for (const r of j.readings) {
      try {
        const n = normalizeEvangelizoCode(r.code);
        const segments = joinChapters(n.segments);
        letters ||= n.hadPartLetters;
        const type: Type = r.type === 'psalm' ? 'psalm' : r.type === 'gospel' ? 'gospel' : ++readingN === 1 ? 'first' : 'second';
        if (r.type !== 'psalm' && r.type !== 'gospel' && r.type !== 'reading') problems.push(`${j.date}: tipo desconocido ${r.type}`);
        readings.push({ type, ref: formatSegs(segments), segments });
      } catch (e) {
        problems.push(`${j.date}: ${(e as Error).message}`);
      }
    }
    days.push({ date: j.date, readings, lastVerseNotes: [], letters });
  }
  return { days, problems };
}
import { formatMassRef } from '@bc/shared';
const formatSegs = formatMassRef;

const sigOf = (d: DayRec) => d.readings.map((r) => `${LETTER[r.type]}|${r.ref}`).join(' ¦ ');

// ---------- consolidación ----------
interface Bucket { key: string; dates: string[]; sigs: Map<string, string[]> }
interface Consensus { sig: string; n: number; total: number; unanimous: boolean }

function addTo(map: Map<string, Bucket>, key: string, d: DayRec) {
  let b = map.get(key);
  if (!b) map.set(key, (b = { key, dates: [], sigs: new Map() }));
  b.dates.push(d.date);
  const s = sigOf(d);
  b.sigs.set(s, [...(b.sigs.get(s) ?? []), d.date]);
}
function consensusOf(b: Bucket): Consensus | null {
  const sorted = [...b.sigs.entries()].sort((a, c) => c[1].length - a[1].length);
  const [top, second] = sorted;
  if (!top) return null;
  const total = b.dates.length;
  if (sorted.length === 1) return { sig: top[0], n: total, total, unanimous: true };
  if (top[1].length >= 2 && top[1].length > (second?.[1].length ?? 0)) return { sig: top[0], n: top[1].length, total, unanimous: false };
  return null;
}

interface Built {
  data: Record<string, string[]>;
  report: Record<string, unknown>;
  stats: { dates: number; keys: number; discrepantKeys: number; unresolved: number };
}

function build(days: DayRec[], opts: LiturgyOptions): Built {
  const strongBuckets = new Map<string, Bucket>(); // cel:id:cycle
  const weak = new Map<string, { d: DayRec; prop: string | null; ferial: string | null }>();
  for (const d of days) {
    const lk = lectionaryLookup(d.date, opts);
    const cel = lk.day.celebration;
    const strong = cel && (cel.rank <= 7 || cel.type === 'sunday' || cel.type === 'special');
    if (strong) addTo(strongBuckets, `cel:${cel!.id}:${lk.day.sundayCycle}`, d);
    else weak.set(d.date, { d, prop: cel ? `cel:${cel.id}` : lk.dateKey ? `d:${lk.dateKey}` : null, ferial: lk.ferialKey });
  }
  // Feria: primer consenso con todos, luego se detectan los propios por fecha/memoria
  const ferialOf = (skip: Set<string>) => {
    const m = new Map<string, Bucket>();
    for (const w of weak.values()) if (w.ferial && !skip.has(w.d.date)) addTo(m, w.ferial, w.d);
    return m;
  };
  let ferial = ferialOf(new Set());
  const ferialSig = (k: string | null) => (k ? consensusOf(ferial.get(k) ?? { key: k, dates: [], sigs: new Map() })?.sig : undefined);
  const propBuckets = new Map<string, Bucket>();
  const byProp = new Map<string, { d: DayRec; ferial: string | null }[]>();
  for (const w of weak.values()) if (w.prop) byProp.set(w.prop, [...(byProp.get(w.prop) ?? []), { d: w.d, ferial: w.ferial }]);
  const properDates = new Set<string>();
  for (const [prop, list] of byProp) {
    const tally = new Map<string, number>();
    for (const x of list) tally.set(sigOf(x.d), (tally.get(sigOf(x.d)) ?? 0) + 1);
    const [topSig, topN] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]!;
    const differing = list.filter((x) => sigOf(x.d) === topSig && ferialSig(x.ferial) !== topSig).length;
    // «Propio» si ≥3 ocurrencias idénticas que no son la lectura ferial (o la memoria no tiene feria: p. ej. fuera de las ferias).
    const noFerial = list.every((x) => !x.ferial);
    if ((topN >= 3 && differing >= 3 && topN / list.length >= 0.5) || (noFerial && topN >= 1 && prop.startsWith('cel:'))) {
      for (const x of list) {
        addTo(propBuckets, prop, x.d);
        properDates.add(x.d.date);
      }
    }
  }
  ferial = ferialOf(properDates);

  const all = [...strongBuckets.values(), ...propBuckets.values(), ...ferial.values()].sort((a, b) => a.key.localeCompare(b.key));
  const data: Record<string, string[]> = {};
  const report: Record<string, unknown> = { discrepancies: [], single: [], unresolved: [], splitByCycle: [], tieBroken: [] };
  const cycleOf = (date: string) => liturgicalDay(date, opts).sundayCycle;
  let disc = 0;
  let unresolved = 0;
  const accept = (b: Bucket, c: Consensus) => {
    data[b.key] = c.sig.split(' ¦ ');
    if (!c.unanimous) {
      disc++;
      (report.discrepancies as unknown[]).push({ key: b.key, chosen: c.sig, agree: `${c.n}/${c.total}`, variants: Object.fromEntries([...b.sigs].filter(([s]) => s !== c.sig).map(([s, d]) => [s, d])) });
    }
    if (c.total === 1) (report.single as unknown[]).push({ key: b.key, date: b.dates[0] });
  };
  /** Sin mayoría clara: gana la variante más frecuente y, a igualdad, la más reciente. Se registra. */
  const tieBreak = (b: Bucket) => {
    const sorted = [...b.sigs.entries()].sort((a, c) => c[1].length - a[1].length || c[1].slice(-1)[0]!.localeCompare(a[1].slice(-1)[0]!));
    unresolved++;
    (report.tieBroken as unknown[]).push({ key: b.key, chosen: sorted[0]![0], variants: Object.fromEntries(sorted.map(([s, d]) => [s, d])) });
    data[b.key] = sorted[0]![0].split(' ¦ ');
  };
  for (const b of all) {
    const c = consensusOf(b);
    if (c) {
      accept(b, c);
      continue;
    }
    // Ferias de Adviento/Cuaresma/Pascua/Navidad: se prueba a separar por ciclo dominical
    if (/^fer:(adv|advd|lent|easter|xmas|postepi):/.test(b.key)) {
      const sub = new Map<string, Bucket>();
      for (const d of days.filter((x) => b.dates.includes(x.date))) addTo(sub, `${b.key}:${cycleOf(d.date)}`, d);
      (report.splitByCycle as unknown[]).push(b.key);
      for (const sb of sub.values()) {
        const sc = consensusOf(sb);
        if (sc) accept(sb, sc);
        else tieBreak(sb);
      }
      continue;
    }
    tieBreak(b);
  }
  // Colapsa cel:<id>:<A|B|C> → cel:<id> si los tres ciclos coinciden
  const byId = new Map<string, string[]>();
  for (const k of Object.keys(data)) {
    const m = /^(cel:.+):([ABC])$/.exec(k);
    if (m) byId.set(m[1]!, [...(byId.get(m[1]!) ?? []), k]);
  }
  for (const [id, ks] of byId) {
    if (ks.length >= 2 && new Set(ks.map((k) => data[k]!.join('¦'))).size === 1 && !data[id]) {
      data[id] = data[ks[0]!]!;
      for (const k of ks) delete data[k];
    }
  }
  return { data, report, stats: { dates: days.length, keys: Object.keys(data).length, discrepantKeys: disc, unresolved } };
}

// ---------- validación ----------
const hasVerses = (pack: Pack, s: BibleRef): boolean => {
  const ch = pack[s.book]?.[String(s.chapter)];
  if (!ch) return false;
  if (s.verseStart === undefined) return true;
  const have = new Set(ch.map((x) => x[0]));
  const endCh = s.chapterEnd ?? s.chapter;
  if (endCh !== s.chapter) return !!pack[s.book]?.[String(endCh)];
  const end = s.verseEnd ?? s.verseStart;
  for (let v = s.verseStart; v <= end; v++) if (!have.has(v)) return false;
  return true;
};

function validate(data: Record<string, string[]>) {
  const refs = new Map<string, string[]>();
  for (const [k, list] of Object.entries(data)) for (const x of list) refs.set(x.split('|')[1]!, [...(refs.get(x.split('|')[1]!) ?? []), k]);
  const fails: { ref: string; keys: string[]; why: string }[] = [];
  let ok = 0;
  const { parseMassRef } = require('@bc/shared') as typeof import('@bc/shared');
  for (const [ref, keys] of refs) {
    let segs: BibleRef[];
    try {
      segs = parseMassRef(ref);
    } catch (e) {
      fails.push({ ref, keys: keys.slice(0, 3), why: `no se puede interpretar: ${(e as Error).message}` });
      continue;
    }
    let good = true;
    let why = '';
    for (const s of segs) {
      // Las citas están en numeración hebrea: se comprueba en SBLM (inglesa) o, si no, en DRA (Vulgata)
      const en = convertRef(s, 'hebrew', 'english');
      const vg = convertRef(s, 'hebrew', 'vulgate');
      if (!hasVerses(SBLM, en) && !hasVerses(DRA, vg)) {
        good = false;
        why = `${s.book} ${s.chapter},${s.verseStart ?? ''}-${s.verseEnd ?? ''} no está en SBLM (${en.chapter},${en.verseStart ?? ''}-${en.verseEnd ?? ''}) ni en DRA (${vg.chapter},${vg.verseStart ?? ''}-${vg.verseEnd ?? ''})`;
      }
    }
    if (good) ok++;
    else fails.push({ ref, keys: keys.slice(0, 3), why });
  }
  return { distinctRefs: refs.size, ok, fails };
}

function main() {
  const args = process.argv.slice(2);
  const { days, problems } = loadDays();
  const combos: LiturgyOptions[] = [];
  for (let i = 0; i < 8; i++) combos.push({ epiphanySunday: !!(i & 1), ascensionSunday: !!(i & 2), corpusSunday: !!(i & 4) });
  if (args.includes('--detect')) {
    for (const o of combos) {
      const b = build(days, o);
      console.log(JSON.stringify(o), JSON.stringify(b.stats));
    }
    return;
  }
  const flag = args.find((a) => a.startsWith('--options='))?.slice(10) ?? '';
  const opts: LiturgyOptions = { epiphanySunday: flag.includes('e'), ascensionSunday: flag.includes('a'), corpusSunday: flag.includes('c') };
  const built = build(days, opts);
  const validation = validate(built.data);
  const sorted: Record<string, string[]> = {};
  for (const k of Object.keys(built.data).sort()) sorted[k] = built.data[k]!;
  const dates = days.map((d) => d.date);
  const out = {
    version: 1,
    source: 'Evangelizo.org',
    versification: 'hebrew',
    from: dates[0],
    to: dates[dates.length - 1],
    options: { epiphanySunday: !!opts.epiphanySunday, ascensionSunday: !!opts.ascensionSunday, corpusSunday: !!opts.corpusSunday },
    days: sorted,
  };
  const dataFile = join(CONTENT_DIR, '..', 'packages', 'shared', 'src', 'lectionary', 'data.json');
  writeFileSync(dataFile, JSON.stringify(out) + '\n');
  mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    generatedFrom: { dates: days.length, from: out.from, to: out.to },
    options: out.options,
    stats: built.stats,
    normalizationProblems: problems,
    partLettersDays: days.filter((d) => d.letters).length,
    validation,
    ...built.report,
  };
  writeFileSync(join(OUT_DIR, 'lectionary-report.json'), JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify({ ...built.stats, problems: problems.length, singles: (built.report.single as unknown[]).length, validation: { distinct: validation.distinctRefs, ok: validation.ok, fails: validation.fails.length } }));
  if (!existsSync(dataFile)) throw new Error('no se escribió data.json');
}
main();
void liturgicalDay;
