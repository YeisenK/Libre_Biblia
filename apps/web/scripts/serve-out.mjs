// Servidor estático mínimo para previsualizar `out/` (puerto 3000).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'out');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, p);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(root, p + '.html'); }
  try { const b = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('No encontrado'); }
}).listen(Number(process.env.PORT) || 3000, () => console.log(`http://localhost:${Number(process.env.PORT) || 3000}`));
