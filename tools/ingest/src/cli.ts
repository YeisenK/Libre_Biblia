import { loadSources as readSources } from './sources';
import { downloadSource } from './download';
import { convertSource } from './convert';
import { validateSource } from './validate';
import { packSources } from './pack';
import { buildMarkdownPack } from './markdown';
import { runCulture } from './culture/build';
import { runCheck, runPack } from './daily';
import { runPrayers } from './prayers';
import { runHours } from './hours';
import { runSaints } from './saints';
import { runFormation } from './formation';
import { buildVersification } from './versification/build';
import { WORKS, WORKS_SPIRITUAL } from './culture/works';
import { runGutenberg } from './culture/gutenberg';
import { WORKS_GUTENBERG } from './culture/works-gutenberg';
import { runTorresAmat } from './torres-amat/build';
import { formatContentReport, runValidateContent } from './integrity';

const USAGE = `Uso: tsx src/cli.ts <download|convert|validate|pack|ingest> [--only VULG,DRA] [--force]\n     tsx src/cli.ts culture [--only slug1,slug2]`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const oi = args.indexOf('--only');
  const only = oi >= 0 ? (args[oi + 1] ?? '').split(',') : undefined;
  const force = args.includes('--force');
  if (cmd === 'validate-content') {
    const r = runValidateContent();
    console.log(formatContentReport(r));
    if (r.errors.length) process.exit(1);
    return;
  }
  if (cmd === 'torres-amat') {
    await runTorresAmat();
    return;
  }
  if (cmd === 'culture') {
    const wanted = only?.map((x) => x.trim());
    const specs = [...WORKS, ...WORKS_SPIRITUAL].filter((w) => !wanted || wanted.includes(w.slug));
    const gspecs = WORKS_GUTENBERG.filter((w) => !wanted || wanted.includes(w.slug));
    if (wanted && specs.length + gspecs.length !== wanted.length) throw new Error('slug desconocido en --only');
    await runCulture(specs);
    await runGutenberg(gspecs);
    return;
  }
  if (cmd === 'versification') {
    const r = buildVersification();
    console.log(`[versification] ${r.entries} tramos, ${r.bytes} bytes, ${r.stats.rows} filas TVTMS, sha256 TVTMS=${r.sha256}`);
    if (r.stats.mismatched) console.log(`  filas con tamaños distintos (ignoradas): ${r.stats.mismatched}`);
    for (const [raw, n] of r.stats.unparsed) console.log(`  celda no interpretada x${n}: ${raw}`);
    console.log(`  libros TVTMS ignorados: ${[...r.stats.skippedBooks].sort().join(' ')}`);
    return;
  }
  if (cmd === 'daily') {
    const sub = args[1];
    const flag = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
    if (sub === 'check') { if (runCheck({ from: flag('from'), to: flag('to'), quiet: args.includes('--quiet') })) process.exit(1); return; }
    if (sub === 'pack') { const w = runPack(); console.log(`[daily.ciclo-tematico] ${w.file}: ${w.bytes} bytes  sha256=${w.sha256}`); return; }
    throw new Error('Uso: daily <check [--from MM-DD --to MM-DD --quiet]|pack>');
  }
  if (cmd === 'formation') {
    const r = runFormation();
    console.log(`[${r.pack.id}] v${r.pack.version}: ${r.pack.documents.length} documentos, ${r.pack.councils.length} concilios, ${r.pack.areas.length} áreas, ${r.pack.itineraries.length} itinerarios`);
    console.log(`  ${r.file}: ${r.bytes} bytes  sha256=${r.sha256}\n  copia: ${r.webCopy}`);
    return;
  }
  if (cmd === 'prayers') {
    const vi = args.indexOf('--version');
    const r = runPrayers({ version: vi >= 0 ? args[vi + 1] : undefined });
    const p = r.pack;
    console.log(`[${p.id}] v${p.version}: ${p.categories.length} categorías, ${p.prayers.length} oraciones, ${p.novenas.length} novenas, ${p.rosary?.mysteries.length ?? 0} misterios, ${p.routines?.length ?? 0} rutinas`);
    console.log(`  ${r.file}: ${r.bytes} bytes  sha256=${r.sha256}\n  copia: ${r.webCopy}`);
    return;
  }
  if (cmd === 'hours') {
    const vi = args.indexOf('--version');
    const r = runHours({ version: vi >= 0 ? args[vi + 1] : undefined });
    console.log(`[${r.pack.id}] v${r.pack.version}: ${r.pack.hymns.length} himnos, ${r.pack.collects.collects.length} colectas, ${Object.keys(r.pack.shortReadings).length} claves de lecturas breves, ${Object.keys(r.pack.officeReadings).length} lecturas del Oficio`);
    console.log(`  ${r.file}: ${r.bytes} bytes  sha256=${r.sha256}\n  copia: ${r.webCopy}`);
    return;
  }
  if (cmd === 'saints') {
    const vi = args.indexOf('--version');
    const r = runSaints({ version: vi >= 0 ? args[vi + 1] : undefined });
    const n = (cal: string) => r.pack.saints.filter((s) => s.celebrations.some((c) => c.calendar === cal)).length;
    console.log(`[${r.pack.id}] v${r.pack.version}: ${r.pack.saints.length} santos (general ${n('general')}, mx ${n('mx')}), ${r.pack.saints.filter((s) => s.unverified).length} unverified`);
    for (const w of r.warnings) console.log(`  aviso: ${w}`);
    console.log(`  ${r.file}: ${r.bytes} bytes  sha256=${r.sha256}\n  copia: ${r.webCopy}`);
    return;
  }
  if (cmd === 'markdown') {
    const flag = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
    const need = (k: string) => { const v = flag(k); if (!v) throw new Error(`Falta --${k}`); return v; };
    const file = args[1];
    if (!file || file.startsWith('--')) throw new Error('Uso: markdown <archivo.md> --id doc.x --genre g --authority a --language es --collection c --source-name n --license l --provenance-url u [--title --subtitle --edition --license-url --retrieved --notes --description]');
    const r = buildMarkdownPack({
      file, id: need('id'), title: flag('title'), subtitle: flag('subtitle'), genre: need('genre'), authority: need('authority') as never,
      language: need('language'), collection: need('collection'), edition: flag('edition'), sourceName: need('source-name'), license: need('license'),
      licenseUrl: flag('license-url'), provenanceUrl: need('provenance-url'), retrievedAt: flag('retrieved'), notes: flag('notes'), description: flag('description'),
    });
    console.log(`[${r.entry.id}] ${r.sections} secciones, ${r.entry.bytes} bytes .gz, sha256=${r.entry.sha256}` + (r.omitted.length ? `; omitido: ${r.omitted.join('; ')}` : ''));
    return;
  }
  if (!cmd || !['download', 'convert', 'validate', 'pack', 'ingest'].includes(cmd)) {
    console.error(USAGE);
    process.exit(2);
  }
  const sources = readSources(only);
  const pipeline = sources.filter((s) => s.format !== 'wikisource-pages'); // Torres Amat: `torres-amat` (descarga+conversión)
  const all = cmd === 'ingest';
  let failed = false;
  if (all || cmd === 'download') for (const s of pipeline) await downloadSource(s, force);
  if (all || cmd === 'convert') for (const s of pipeline) convertSource(s);
  if (all || cmd === 'validate') for (const s of sources) if (validateSource(s).errors.length) failed = true;
  if (failed) {
    console.error('Validación con errores: no se continúa.');
    process.exit(1);
  }
  if (all || cmd === 'pack') packSources(sources);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
