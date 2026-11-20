// Servidor de catálogo de PRUEBA (datos sintéticos, no son texto bíblico real). Puerto 5055, con CORS.
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const source = { name: 'PRUEBA sintética', license: 'Dominio público (fixture de prueba)', provenanceUrl: 'https://example.invalid/prueba', retrievedAt: '2026-01-01T00:00:00Z' };
const bible = {
  format: 1, kind: 'bible', id: 'bible.TEST', version: '1',
  meta: { code: 'TEST', name: 'Biblia de prueba (sintética)', language: 'es', edition: 'fixture', versification: 'vulgate', completeness: 'partial', source },
  books: { Gen: { '1': [[1, 'Lorem ipsum dolor sit amet de prueba.'], [2, 'Consectetur adipiscing elit, sed do eiusmod.']] }, John: { '1': [[1, 'Ut enim ad minim veniam, quis nostrud.']] } },
};
const doc = {
  format: 1, kind: 'document', id: 'doc.test', version: '1',
  meta: { slug: 'test', title: 'Documento de prueba', genre: 'essay', authority: 'literary', language: 'es', collection: 'Pruebas', textFormat: 'markdown', source },
  sections: [{ path: '1', depth: 1, title: 'Primera', text: 'Texto **sintético** de prueba.' }],
};
const files = {};
const packs = [bible, doc].map((p) => {
  const gz = gzipSync(Buffer.from(JSON.stringify(p)));
  const url = `packs/${p.id}.json.gz`;
  files['/' + url] = gz;
  const b = p.kind === 'bible';
  return { id: p.id, kind: p.kind, version: p.version, title: b ? p.meta.name : p.meta.title, language: p.meta.language, url, bytes: gz.length, sha256: createHash('sha256').update(gz).digest('hex'), authority: b ? 'scripture' : 'literary', collection: b ? 'Biblias' : 'Pruebas', source };
});
const catalog = JSON.stringify({ format: 1, name: 'Catálogo de PRUEBA', updatedAt: '2026-01-01T00:00:00Z', packs });

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (path === '/catalog.json') return void res.writeHead(200, { 'Content-Type': 'application/json' }).end(catalog);
  if (files[path]) return void res.writeHead(200, { 'Content-Type': 'application/gzip' }).end(files[path]);
  res.writeHead(404).end('no');
}).listen(5055, () => console.log('fixture catalog http://localhost:5055/catalog.json'));
