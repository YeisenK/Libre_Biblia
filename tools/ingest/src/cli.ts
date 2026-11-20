import { loadSources as readSources } from './sources';
import { downloadSource } from './download';
import { convertSource } from './convert';
import { validateSource } from './validate';
import { packSources } from './pack';
import { buildMarkdownPack } from './markdown';
import { runCulture } from './culture/build';
import { runCheck, runPack } from './daily';
import { WORKS, WORKS_SPIRITUAL } from './culture/works';

const USAGE = `Uso: tsx src/cli.ts <download|convert|validate|pack|ingest> [--only VULG,DRA] [--force]\n     tsx src/cli.ts culture [--only slug1,slug2]`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const oi = args.indexOf('--only');
  const only = oi >= 0 ? (args[oi + 1] ?? '').split(',') : undefined;
  const force = args.includes('--force');
  if (cmd === 'culture') {
    const wanted = only?.map((x) => x.trim());
    const specs = [...WORKS, ...WORKS_SPIRITUAL].filter((w) => !wanted || wanted.includes(w.slug));
    if (wanted && specs.length !== wanted.length) throw new Error('slug desconocido en --only');
    await runCulture(specs);
    return;
  }
  if (cmd === 'daily') {
    const sub = args[1];
    const flag = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
    if (sub === 'check') { if (runCheck({ from: flag('from'), to: flag('to'), quiet: args.includes('--quiet') })) process.exit(1); return; }
    if (sub === 'pack') { const w = runPack(); console.log(`[daily.ciclo-tematico] ${w.file}: ${w.bytes} bytes  sha256=${w.sha256}`); return; }
    throw new Error('Uso: daily <check [--from MM-DD --to MM-DD --quiet]|pack>');
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
  const all = cmd === 'ingest';
  let failed = false;
  if (all || cmd === 'download') for (const s of sources) await downloadSource(s, force);
  if (all || cmd === 'convert') for (const s of sources) convertSource(s);
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
