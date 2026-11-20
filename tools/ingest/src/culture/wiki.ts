/**
 * Cliente mínimo de la API de MediaWiki (Wikisource) con limitación de ritmo,
 * reintentos con backoff y caché en raw/culture/<slug>/. Los datos son no confiables:
 * solo se leen como JSON/texto.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAW_DIR } from '../paths';

export const UA = 'LibreBiblia-ingest/0.1 (+https://github.com/YeisenK/Libre_Biblia)';
const GAP_MS = 1500;
let lastReq = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Wiki {
  constructor(public readonly lang: string = 'es') {}
  /** Nombre del espacio de nombres de páginas de escaneo (ProofreadPage). */
  get pageNs() { return ({ es: 'Página', fr: 'Page', la: 'Pagina' } as Record<string, string>)[this.lang] ?? 'Page'; }
  get base() { return `https://${this.lang}.wikisource.org`; }

  private async throttled(url: string): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      const wait = lastReq + GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastReq = Date.now();
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
      if (res.ok) return res.json();
      if ((res.status === 429 || res.status >= 500) && attempt < 7) {
        const ra = Number(res.headers.get('retry-after'));
        const back = Math.max(Number.isFinite(ra) ? ra * 1000 : 0, 4000 * 2 ** attempt);
        console.log(`  HTTP ${res.status}; reintento en ${Math.round(back / 1000)} s`);
        await sleep(back);
        continue;
      }
      throw new Error(`HTTP ${res.status} en ${url}`);
    }
  }

  /** GET a la API con caché por slug (no repite lo ya pedido). */
  async api(slug: string, params: Record<string, string>): Promise<any> {
    const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
    const url = `${this.base}/w/api.php?${qs}`;
    const dir = join(RAW_DIR, 'culture', slug);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, createHash('sha1').update(url).digest('hex').slice(0, 20) + '.json');
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).data;
    const data = await this.throttled(url);
    writeFileSync(file, JSON.stringify({ url, data }));
    return data;
  }

  async parsePage(slug: string, title: string): Promise<{ title: string; revid: number; wikitext: string } | null> {
    const d = await this.api(slug, { action: 'parse', page: title, prop: 'wikitext|revid', redirects: '1' });
    if (d.error || !d.parse) return null;
    return { title: d.parse.title, revid: d.parse.revid, wikitext: d.parse.wikitext };
  }

  /** Contenido de varias páginas (cualquier espacio de nombres), en lotes de 40. */
  async getPages(slug: string, titles: string[]): Promise<Map<string, { content: string; revid: number } | null>> {
    const out = new Map<string, { content: string; revid: number } | null>();
    for (let i = 0; i < titles.length; i += 40) {
      const batch = titles.slice(i, i + 40);
      const d = await this.api(slug, {
        action: 'query', prop: 'revisions', rvprop: 'content|ids', rvslots: 'main', titles: batch.join('|'),
      });
      if (!d.query) throw new Error(`Respuesta inesperada de la API: ${JSON.stringify(d).slice(0, 300)}`);
      const norm = new Map<string, string>(); // título normalizado -> solicitado
      for (const n of d.query.normalized ?? []) norm.set(n.to, n.from);
      for (const p of d.query.pages) {
        const asked = norm.get(p.title) ?? p.title;
        out.set(asked, p.missing || !p.revisions ? null : { content: p.revisions[0].slots.main.content, revid: p.revisions[0].revid });
      }
    }
    return out;
  }

  async allPages(slug: string, namespace: number, prefix: string): Promise<string[]> {
    const d = await this.api(slug, { action: 'query', list: 'allpages', apnamespace: String(namespace), apprefix: prefix, aplimit: '500' });
    return d.query.allpages.map((p: { title: string }) => p.title);
  }

  oldidUrl(title: string, revid: number): string {
    return `${this.base}/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&oldid=${revid}`;
  }
  historyUrl(title: string): string {
    return `${this.base}/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=history`;
  }
}
