/**
 * Generador de paquetes de audio de oración con las voces de Juglar.
 * Uso: tools/audio/README.md
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { PACK_FORMAT_VERSION, parseReference, type AudioClip, type AudioPack, type BiblePack, type CatalogEntry, type PrayersPack } from '@bc/shared';
import { gzipDeterministic, upsertCatalogEntries } from '../../ingest/src/catalog';
import { CATALOG_FILE, PACKS_DIR } from '../../ingest/src/paths';
import { anuncioMisterio, limpiarMarkdown, textoVersiculos } from './texto';

const RAIZ = resolve(__dirname, '..');
const CACHE = join(RAIZ, '.cache');
const JUGLAR_VOCES = join(process.env.JUGLAR_DATA ?? join(homedir(), '.local/share/juglar'), 'voces');

/** Voces elegidas: carpeta de Juglar → id de la voz en el paquete. Ajustes = los de Juglar (ver README). */
const VOCES: Record<string, { carpeta: string; ajustes: Record<string, number> }> = {
  narrador: { carpeta: 'narrador', ajustes: { temperature: 0.9 } },
  fraile: { carpeta: 'fraile', ajustes: { temperature: 0.9 } },
  helena: { carpeta: 'helena', ajustes: { temperature: 0.9 } },
  micael: { carpeta: 'micael', ajustes: { temperature: 0.9 } },
};

/** Oraciones fundamentales que se incluyen siempre (si existen en el paquete). */
const FUNDAMENTALES = [
  'senal-de-la-cruz', 'padre-nuestro', 'ave-maria', 'gloria', 'credo-apostoles', 'credo-niceno', 'salve', 'oracion-fatima',
  'oracion-final-rosario', 'letania-lauretana', 'acto-de-contricion', 'angelus', 'regina-coeli', 'angel-de-la-guarda',
  'san-miguel-arcangel', 'ven-espiritu-santo', 'bajo-tu-amparo', 'acordaos', 'ofrecimiento-del-dia', 'oracion-de-la-noche',
  'bendicion-mesa', 'accion-de-gracias-comida', 'acto-de-fe', 'acto-de-esperanza', 'acto-de-caridad', 'magnificat',
  'requiem-aeternam', 'coronilla-divina-misericordia',
];
const ROSARIO_BASE = ['senal-de-la-cruz', 'padre-nuestro', 'ave-maria', 'gloria', 'credo-apostoles', 'salve', 'oracion-fatima', 'oracion-final-rosario', 'letania-lauretana'];
const INDICACIONES: Record<string, string> = {
  inicio: 'Comenzamos el Santo Rosario.',
  fin: 'Hemos terminado el Santo Rosario. Amén.',
};

interface Opciones {
  voces: string[];
  soloRosario: boolean;
  todasOraciones: boolean;
  indicaciones: boolean;
  limite: number;
  revisar: boolean;
  oraciones: string;
  biblia: string;
  salida: string;
  catalogo: boolean;
  muestras: string | null;
  claves: string[] | null;
  plan: boolean;
}

function ayuda(): never {
  console.log(`Uso: tsx tools/audio/src/cli.ts [opciones]
  --voz narrador|fraile|helena|micael|todas   (por defecto: narrador)
  --solo-rosario        solo las oraciones del Rosario y los misterios
  --todas-oraciones     todas las oraciones del paquete (no solo Rosario y fundamentales)
  --indicaciones        añade rosary:cue:* (indicaciones habladas)
  --limite N            solo los primeros N clips (pruebas)
  --claves a,b,c        solo estas claves (p. ej. prayer:gloria)
  --plan                solo muestra la lista de clips y sus textos, sin generar
  --no-revisar          sin revisión con Whisper (más rápido)
  --oraciones RUTA      paquete de oraciones (por defecto content/packs/prayers.es.json.gz)
  --biblia RUTA         Biblia para los pasajes (por defecto content/packs/bible.BLL.json.gz)
  --salida DIR          directorio del paquete (por defecto content/packs; si es otro, no toca el catálogo)
  --sin-catalogo        no fusionar content/catalog.json
  --muestras DIR        copia además los .ogg generados a DIR`);
  process.exit(0);
}

function leerArgs(argv: string[]): Opciones {
  const o: Opciones = {
    voces: ['narrador'], soloRosario: false, todasOraciones: false, indicaciones: false, limite: Infinity, revisar: true,
    oraciones: join(PACKS_DIR, 'prayers.es.json.gz'), biblia: join(PACKS_DIR, 'bible.BLL.json.gz'), salida: PACKS_DIR,
    catalogo: true, muestras: null, claves: null, plan: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const v = () => argv[++i] ?? ayuda();
    if (a === '--voz') {
      const x = v();
      o.voces = x === 'todas' ? Object.keys(VOCES) : x.split(',');
      for (const k of o.voces) if (!VOCES[k]) throw new Error(`Voz desconocida: ${k}`);
    } else if (a === '--solo-rosario') o.soloRosario = true;
    else if (a === '--todas-oraciones') o.todasOraciones = true;
    else if (a === '--indicaciones') o.indicaciones = true;
    else if (a === '--limite') o.limite = Number(v());
    else if (a === '--claves') o.claves = v().split(',');
    else if (a === '--plan') o.plan = true;
    else if (a === '--no-revisar') o.revisar = false;
    else if (a === '--oraciones') o.oraciones = resolve(v());
    else if (a === '--biblia') o.biblia = resolve(v());
    else if (a === '--salida') o.salida = resolve(v());
    else if (a === '--sin-catalogo') o.catalogo = false;
    else if (a === '--muestras') o.muestras = resolve(v());
    else if (a === '-h' || a === '--help') ayuda();
    else throw new Error(`Opción desconocida: ${a}`);
  }
  if (resolve(o.salida) !== resolve(PACKS_DIR)) o.catalogo = false;
  return o;
}

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const leerJson = <T>(p: string): T => JSON.parse((p.endsWith('.gz') ? gunzipSync(readFileSync(p)) : readFileSync(p)).toString('utf8')) as T;

interface Clip { key: string; texto: string }

/** Decide la lista de clips y el texto de cada uno. */
export function planificar(pack: PrayersPack, biblia: BiblePack | null, o: Pick<Opciones, 'soloRosario' | 'todasOraciones' | 'indicaciones'>): Clip[] {
  const porId = new Map(pack.prayers.map((p) => [p.id, p]));
  const usadas = new Set<string>(ROSARIO_BASE);
  for (const e of pack.rosary?.extras ?? []) usadas.add(e.prayer);
  let ids: string[];
  if (o.todasOraciones) ids = pack.prayers.map((p) => p.id);
  else if (o.soloRosario) ids = [...usadas];
  else ids = [...new Set([...usadas, ...FUNDAMENTALES])];
  const clips: Clip[] = [];
  for (const id of ids) {
    const p = porId.get(id);
    if (!p) continue;
    const texto = limpiarMarkdown(p.text);
    if (texto) clips.push({ key: `prayer:${id}`, texto });
  }
  for (const m of pack.rosary?.mysteries ?? []) {
    const base = `mystery:${m.set}-${m.n}`;
    clips.push({ key: `${base}:announce`, texto: anuncioMisterio(m.set, m.n, m.title) });
    const refl = limpiarMarkdown(m.reflection);
    if (refl) clips.push({ key: `${base}:reflection`, texto: refl });
    if (biblia) {
      const t = pasaje(biblia, m.ref);
      if (t) clips.push({ key: `${base}:passage`, texto: t });
      else console.warn(`  (sin pasaje para ${m.set}-${m.n}: ${m.ref})`);
    }
  }
  if (o.indicaciones) for (const [id, t] of Object.entries(INDICACIONES)) clips.push({ key: `rosary:cue:${id}`, texto: t });
  return clips;
}

/** Versículos de una cita («Lc 1,26-38»; varias separadas por «;») leídos de la Biblia. */
export function pasaje(b: BiblePack, citas: string): string {
  const partes: string[] = [];
  for (const cita of citas.split(';')) {
    const r = parseReference(cita);
    const caps = b.books[r.book];
    if (!caps) return '';
    const c1 = r.chapterEnd !== undefined && r.verseStart === undefined ? r.chapterEnd : (r.chapterEnd ?? r.chapter);
    const versos: string[] = [];
    for (let c = r.chapter; c <= c1; c++) {
      for (const [n, t] of caps[String(c)] ?? []) {
        if (r.verseStart !== undefined) {
          const v1 = r.verseEnd ?? r.verseStart;
          if ((c === r.chapter && n < r.verseStart) || (c === c1 && n > v1)) continue;
        }
        versos.push(t);
      }
    }
    partes.push(textoVersiculos(versos));
  }
  return partes.filter(Boolean).join('\n\n');
}

/** Procesos de Qwen de Juglar en marcha (el trabajador `motores/qwen_worker.py` ejecutado por Python). */
function gpuOcupada(): string | null {
  const r = spawnSync('pgrep', ['-af', 'qwen_worker[.]py'], { encoding: 'utf8' }).stdout.split('\n');
  const pids = r.filter((l) => /(^|\s)\S*python\S*\s.*qwen_worker\.py/.test(l)).map((l) => l.split(' ')[0]!);
  return pids.length ? `Qwen en marcha (pid ${pids.join(', ')})` : null;
}

async function esperarGpu(): Promise<void> {
  let avisado = false;
  for (let i = 0; i < 360; i++) {
    const ocupada = gpuOcupada();
    if (!ocupada) return;
    if (!avisado) console.log(`Juglar está usando la GPU: ${ocupada}. Espero (hasta 30 min)…`);
    avisado = true;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('La GPU sigue ocupada por Juglar; vuelve a lanzar el generador cuando termine (la caché permite reanudar).');
}

function duracion(ogg: string): number {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', ogg], { encoding: 'utf8' });
  const d = Number(r.stdout.trim());
  if (!Number.isFinite(d)) throw new Error(`ffprobe no pudo medir ${ogg}`);
  return Math.round(d * 10) / 10;
}

/** Genera un clip: md2audio (WAV, nivelado por Juglar) → Opus/OGG mono ~36 kbps. */
function generar(clip: Clip, voz: keyof typeof VOCES & string, destino: string, o: Opciones): void {
  const cfg = VOCES[voz]!;
  const tmp = join(tmpdir(), `bc-audio-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const txt = join(tmp, 'clip.txt');
  const wav = join(tmp, 'clip.wav');
  writeFileSync(txt, clip.texto + '\n');
  rmSync(wav, { force: true });
  const args = ['-v', `qwen:${cfg.carpeta}`, '-o', wav, '--qwen-ajustes', JSON.stringify(cfg.ajustes), ...(o.revisar ? [] : ['--no-revisar']), txt];
  const r = spawnSync('md2audio', args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0 || !existsSync(wav)) throw new Error(`md2audio falló para ${clip.key}: ${(r.stderr || r.stdout).slice(-600)}`);
  const f = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'libopus', '-b:a', '36k', '-application', 'voip', '-vbr', 'on', '-map_metadata', '-1', destino + '.tmp.ogg'], { encoding: 'utf8' });
  if (f.status !== 0) throw new Error(`ffmpeg falló para ${clip.key}: ${f.stderr}`);
  spawnSync('mv', [destino + '.tmp.ogg', destino]);
  rmSync(tmp, { recursive: true, force: true });
}

async function main() {
  const o = leerArgs(process.argv.slice(2));
  const prayers = leerJson<PrayersPack>(o.oraciones);
  const biblia = existsSync(o.biblia) ? leerJson<BiblePack>(o.biblia) : null;
  if (!biblia) console.warn('Aviso: no hay Biblia; se omiten los pasajes.');
  let clips = planificar(prayers, biblia, o);
  if (o.claves) clips = clips.filter((c) => o.claves!.includes(c.key));
  if (Number.isFinite(o.limite)) clips = clips.slice(0, o.limite);
  console.log(`${clips.length} clips por voz.`);
  if (o.plan) {
    for (const c of clips) console.log(`\n# ${c.key}\n${c.texto}`);
    return;
  }
  const entradas: CatalogEntry[] = [];

  for (const voz of o.voces) {
    const cfg = VOCES[voz]!;
    const metaPath = join(JUGLAR_VOCES, cfg.carpeta, 'meta.json');
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { label: string; descripcion?: string };
    const cacheDir = join(CACHE, voz);
    mkdirSync(cacheDir, { recursive: true });
    console.log(`\n== Voz ${voz} (${meta.label}) ==`);
    const salida: AudioClip[] = [];
    const t0 = Date.now();
    let nuevos = 0;
    for (const [i, c] of clips.entries()) {
      const textSha256 = sha(c.texto);
      // La caché depende del texto y de los ajustes de la voz: si cambian, se regenera.
      const f = join(cacheDir, `${sha(`${c.texto}\0${JSON.stringify(cfg.ajustes)}\0${cfg.carpeta}`)}.ogg`);
      if (!existsSync(f)) {
        await esperarGpu();
        const t = Date.now();
        generar(c, voz, f, o);
        nuevos++;
        console.log(`[${i + 1}/${clips.length}] ${c.key} generado (${((Date.now() - t) / 1000).toFixed(0)} s)`);
      } else console.log(`[${i + 1}/${clips.length}] ${c.key} en caché`);
      salida.push({ key: c.key, mime: 'audio/ogg', data: readFileSync(f).toString('base64'), seconds: duracion(f), textSha256 });
      if (o.muestras) {
        mkdirSync(o.muestras, { recursive: true });
        copyFileSync(f, join(o.muestras, `${voz}__${c.key.replace(/[:]/g, '_')}.ogg`));
      }
    }
    const src = prayers.meta.source;
    const pack: AudioPack = {
      format: PACK_FORMAT_VERSION,
      kind: 'audio',
      id: `audio.oraciones.${voz}`,
      version: src.retrievedAt.slice(0, 10).replace(/-/g, '.'),
      meta: {
        title: `Voz de oración: ${meta.label}`,
        description: `Oraciones, misterios del Rosario y pasajes leídos con la voz «${meta.label}». ${meta.descripcion ?? ''}`.trim(),
        authority: 'devotional',
        language: 'es',
        voice: { id: voz, label: meta.label, ...(meta.descripcion ? { description: meta.descripcion } : {}) },
        forPack: prayers.id,
        generator: 'Juglar (Qwen3-TTS)',
        source: {
          name: `Voz «${meta.label}» generada con Juglar (Qwen3-TTS) a partir de los textos de ${prayers.id}`,
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          provenanceUrl: src.provenanceUrl,
          retrievedAt: src.retrievedAt,
          notes: 'Audio sintético; los pasajes bíblicos son de la Santa Biblia libre Latinoamericana (dominio público).',
        },
      },
      clips: salida,
    };
    mkdirSync(o.salida, { recursive: true });
    const buf = gzipDeterministic(pack);
    const file = `${pack.id}.json.gz`;
    writeFileSync(join(o.salida, file), buf);
    const min = ((Date.now() - t0) / 60000).toFixed(1);
    const seg = salida.reduce((a, c) => a + c.seconds, 0);
    console.log(`→ ${join(o.salida, file)}: ${(buf.length / 1048576).toFixed(2)} MB, ${salida.length} clips, ${(seg / 60).toFixed(1)} min de audio, ${nuevos} nuevos, ${min} min de trabajo`);
    entradas.push({
      id: pack.id, kind: 'audio', version: pack.version, title: pack.meta.title, ...(pack.meta.description ? { description: pack.meta.description } : {}),
      language: 'es', url: `packs/${file}`, bytes: buf.length, sha256: sha(buf), authority: 'devotional', collection: 'Voces de oración', source: pack.meta.source,
    });
  }
  if (o.catalogo) {
    upsertCatalogEntries(entradas, CATALOG_FILE);
    console.log(`Catálogo actualizado: ${CATALOG_FILE}`);
  } else console.log('Catálogo sin tocar.');
  void readdirSync;
}

if (require.main === module) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
