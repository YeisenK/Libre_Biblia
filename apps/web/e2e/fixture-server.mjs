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
// Ciclo diario SINTÉTICO de prueba: una entrada por cada MM-DD (366), todas marcadas como prueba.
const dailyEntries = [];
for (let t = Date.UTC(2024, 0, 1), i = 0; i < 366; i++, t += 86400000) {
  const date = new Date(t).toISOString().slice(5, 10);
  dailyEntries.push({ date, title: `PRUEBA sintética ${date}`, theme: 'Tema de prueba', ref: 'Jn 1,1-2', psalmNumbering: 'hebrew', related: ['Gn 1,1'], context: 'Contexto sintético de prueba.', reflection: 'Reflexión **sintética** de prueba.', questions: ['¿Pregunta de prueba uno?', '¿Pregunta de prueba dos?'], prayer: 'Oración sintética de prueba. Amén.' });
}
const daily = {
  format: 1, kind: 'daily', id: 'daily.test', version: '1',
  meta: { title: 'Ciclo de PRUEBA (sintético)', description: 'Solo para pruebas automáticas.', authority: 'devotional', language: 'es', status: 'draft', source },
  entries: dailyEntries,
};
const files = {};
const packs = [bible, doc, daily].map((p) => {
  const gz = gzipSync(Buffer.from(JSON.stringify(p)));
  const url = `packs/${p.id}.json.gz`;
  files['/' + url] = gz;
  const b = p.kind === 'bible';
  const d = p.kind === 'daily';
  return { id: p.id, kind: p.kind, version: p.version, title: b ? p.meta.name : p.meta.title, language: p.meta.language, url, bytes: gz.length, sha256: createHash('sha256').update(gz).digest('hex'), authority: b ? 'scripture' : d ? 'devotional' : 'literary', collection: b ? 'Biblias' : d ? 'Versículo del día' : 'Pruebas', ...(d ? { status: 'draft' } : {}), source };
});
const catalog = JSON.stringify({ format: 1, name: 'Catálogo de PRUEBA', updatedAt: '2026-01-01T00:00:00Z', packs });

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (path === '/catalog.json') return void res.writeHead(200, { 'Content-Type': 'application/json' }).end(catalog);
  if (files[path]) return void res.writeHead(200, { 'Content-Type': 'application/gzip' }).end(files[path]);
  res.writeHead(404).end('no');
}).listen(5055, () => console.log('fixture catalog http://localhost:5055/catalog.json'));
