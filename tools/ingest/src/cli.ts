import { loadSources as readSources } from './sources';
import { downloadSource } from './download';
import { convertSource } from './convert';
import { validateSource } from './validate';
import { loadSources as loadToDb } from './load';

const USAGE = `Uso: tsx src/cli.ts <download|convert|validate|load|ingest> [--only VULG,DRA] [--force]`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const oi = args.indexOf('--only');
  const only = oi >= 0 ? (args[oi + 1] ?? '').split(',') : undefined;
  const force = args.includes('--force');
  if (!cmd || !['download', 'convert', 'validate', 'load', 'ingest'].includes(cmd)) {
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
  if (all || cmd === 'load') await loadToDb(sources);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
