// Se fija antes de cargar la app: los tests hacen muchas llamadas a /auth desde la misma IP.
process.env.THROTTLE_AUTH_LIMIT = '10000';
process.env.THROTTLE_LIMIT = '10000';

import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@bc/db';
import { CANON } from '@bc/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/setup';

const TEST = 'TEST';
const TEST2 = 'TEST2';
const SOURCE_KEY = 'e2e:test-source';
const EMAIL_PREFIX = 'e2e-';
const sufijo = Date.now().toString(36);
const emailA = `${EMAIL_PREFIX}a-${sufijo}@example.com`;
const emailB = `${EMAIL_PREFIX}b-${sufijo}@example.com`;
const PASS = 'contraseña-de-prueba-123';

const bookId = (osis: string) => CANON.find((b) => b.osis === osis)!.order;
const JOHN = bookId('John');
const GEN = bookId('Gen');

describe('API e2e (versión TEST)', () => {
  let app: INestApplication;
  const db = new PrismaClient();
  const http = () => app.getHttpServer();

  async function limpiar() {
    await db.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
    await db.bibleVersion.deleteMany({ where: { code: { in: [TEST, TEST2] } } }); // cascada: capítulos y versículos
    await db.source.deleteMany({ where: { key: SOURCE_KEY } });
  }

  beforeAll(async () => {
    await limpiar();
    const source = await db.source.create({ data: { key: SOURCE_KEY, name: 'Fuente de prueba e2e', license: 'TEST' } });
    const mk = (code: string) =>
      db.bibleVersion.create({ data: { code, name: `Versión ${code} (e2e)`, language: 'es', tsConfig: 'simple', sourceId: source.id } });
    const [v1, v2] = [await mk(TEST), await mk(TEST2)];
    const verses: Record<string, [number, number, number, string][]> = {
      [v1.id]: [
        [GEN, 1, 1, 'texto de prueba uno'],
        [GEN, 1, 2, 'texto de prueba dos'],
        [JOHN, 3, 16, 'amor de prueba <script>alert(1)</script> & "comillas"'],
        [JOHN, 3, 17, 'segundo versículo del amor'],
        [JOHN, 3, 18, 'tercer versículo'],
        [JOHN, 4, 1, 'otro capítulo'],
      ],
      [v2.id]: [
        [JOHN, 3, 16, 'test love verse sixteen'],
        [JOHN, 3, 18, 'test verse eighteen'],
      ],
    };
    for (const [versionId, rows] of Object.entries(verses)) {
      await db.bibleVerse.createMany({
        data: rows.map(([b, chapter, verse, text]) => ({ versionId, bookId: b, chapter, verse, text, tsConfig: 'simple' })),
      });
      const caps = new Map<string, number>();
      rows.forEach(([b, c]) => caps.set(`${b}:${c}`, (caps.get(`${b}:${c}`) ?? 0) + 1));
      await db.bibleChapter.createMany({
        data: [...caps].map(([k, n]) => {
          const [b, c] = k.split(':').map(Number) as [number, number];
          return { versionId, bookId: b, chapter: c, verseCount: n };
        }),
      });
    }
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app, { swagger: false });
    await app.init();
  });

  afterAll(async () => {
    await limpiar();
    await db.$disconnect();
    await app?.close();
  });

  describe('salud', () => {
    it('GET /health', async () => {
      const r = await request(http()).get('/api/v1/health').expect(200);
      expect(r.body).toEqual({ status: 'ok', db: 'ok' });
    });
  });

  describe('validación', () => {
    it('email inválido → 400', async () => {
      await request(http()).post('/api/v1/auth/register').send({ email: 'no-es-email', password: PASS }).expect(400);
    });
    it('contraseña corta → 400', async () => {
      await request(http()).post('/api/v1/auth/register').send({ email: `${EMAIL_PREFIX}c-${sufijo}@example.com`, password: 'corta' }).expect(400);
    });
    it('campos desconocidos → 400 (forbidNonWhitelisted)', async () => {
      await request(http()).post('/api/v1/auth/register').send({ email: `${EMAIL_PREFIX}d-${sufijo}@example.com`, password: PASS, admin: true }).expect(400);
    });
    it('rutas privadas sin token → 401', async () => {
      await request(http()).get('/api/v1/users/me').expect(401);
      await request(http()).get('/api/v1/bookmarks').expect(401);
    });
  });

  describe('autenticación: registro → login → me → refresh → logout', () => {
    const agent = () => request.agent(http());
    it('flujo web con cookie httpOnly y rotación', async () => {
      const a = agent();
      const reg = await a.post('/api/v1/auth/register').send({ email: emailA, password: PASS, displayName: 'Ana' }).expect(201);
      expect(reg.body.accessToken).toBeTruthy();
      expect(reg.body.refreshToken).toBeUndefined();
      expect(reg.body.user).toMatchObject({ email: emailA, displayName: 'Ana' });
      expect(reg.body.user.passwordHash).toBeUndefined();
      const cookie = (reg.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('bc_rt='))!;
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);

      await request(http()).post('/api/v1/auth/register').send({ email: emailA, password: PASS }).expect(409);
      await request(http()).post('/api/v1/auth/login').send({ email: emailA, password: 'incorrecta-123456' }).expect(401);

      const login = await a.post('/api/v1/auth/login').send({ email: emailA, password: PASS }).expect(200);
      const me = await request(http()).get('/api/v1/users/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
      expect(me.body.email).toBe(emailA);

      const antes = (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0];
      const ref = await a.post('/api/v1/auth/refresh').expect(200);
      const despues = (ref.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0];
      expect(despues).not.toBe(antes); // rotación
      expect(ref.body.accessToken).toBeTruthy();

      await a.post('/api/v1/auth/logout').expect(204);
      await a.post('/api/v1/auth/refresh').expect(401);
    });

    it('cliente nativo: refreshToken en el cuerpo y sin cookie', async () => {
      const email = `${EMAIL_PREFIX}n-${sufijo}@example.com`;
      const reg = await request(http()).post('/api/v1/auth/register').set('X-Client', 'native').send({ email, password: PASS }).expect(201);
      expect(reg.headers['set-cookie']).toBeUndefined();
      const rt1 = reg.body.refreshToken as string;
      expect(rt1).toBeTruthy();
      const r2 = await request(http()).post('/api/v1/auth/refresh').set('X-Client', 'native').send({ refreshToken: rt1 }).expect(200);
      expect(r2.body.refreshToken).toBeTruthy();
      expect(r2.body.refreshToken).not.toBe(rt1);
      await request(http()).post('/api/v1/auth/logout').set('X-Client', 'native').send({ refreshToken: r2.body.refreshToken }).expect(204);
    });

    it('refresh reutilizado revoca toda la familia', async () => {
      const email = `${EMAIL_PREFIX}r-${sufijo}@example.com`;
      const reg = await request(http()).post('/api/v1/auth/register').set('X-Client', 'native').send({ email, password: PASS }).expect(201);
      const rt1 = reg.body.refreshToken as string;
      const r2 = await request(http()).post('/api/v1/auth/refresh').set('X-Client', 'native').send({ refreshToken: rt1 }).expect(200);
      const rt2 = r2.body.refreshToken as string;
      await request(http()).post('/api/v1/auth/refresh').set('X-Client', 'native').send({ refreshToken: rt1 }).expect(401); // reuso
      await request(http()).post('/api/v1/auth/refresh').set('X-Client', 'native').send({ refreshToken: rt2 }).expect(401); // familia revocada
    });
  });

  describe('marcadores aislados por usuario', () => {
    let tokA: string;
    let tokB: string;
    beforeAll(async () => {
      tokA = (await request(http()).post('/api/v1/auth/login').send({ email: emailA, password: PASS })).body.accessToken;
      tokB = (await request(http()).post('/api/v1/auth/register').send({ email: emailB, password: PASS })).body.accessToken;
    });
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

    it('CRUD y aislamiento', async () => {
      const c = await request(http()).post('/api/v1/bookmarks').set(auth(tokA)).send({ version: TEST, book: 'John', chapter: 3, verse: 16, label: 'clave' }).expect(201);
      expect(c.body).toMatchObject({ version: TEST, book: 'John', chapter: 3, verse: 16, label: 'clave' });
      const id = c.body.id as string;

      const dup = await request(http()).post('/api/v1/bookmarks').set(auth(tokA)).send({ book: 'John', chapter: 3, verse: 16 }).expect(201);
      expect(dup.body.id).toBe(id); // idempotente

      const listA = await request(http()).get('/api/v1/bookmarks').set(auth(tokA)).expect(200);
      expect(listA.body.map((b: { id: string }) => b.id)).toContain(id);
      const listB = await request(http()).get('/api/v1/bookmarks').set(auth(tokB)).expect(200);
      expect(listB.body).toEqual([]);

      await request(http()).delete(`/api/v1/bookmarks/${id}`).set(auth(tokB)).expect(404);
      expect((await request(http()).get('/api/v1/bookmarks').set(auth(tokA))).body).toHaveLength(1);
      await request(http()).delete(`/api/v1/bookmarks/${id}`).set(auth(tokA)).expect(204);
      expect((await request(http()).get('/api/v1/bookmarks').set(auth(tokA))).body).toEqual([]);
    });

    it('lectura: historial y posición por usuario', async () => {
      await request(http()).post('/api/v1/reading/history').set(auth(tokA)).send({ version: TEST, book: 'John', chapter: 3 }).expect(204);
      await request(http()).post('/api/v1/reading/history').set(auth(tokA)).send({ version: TEST, book: 'John', chapter: 3 }).expect(204);
      const h = await request(http()).get('/api/v1/reading/history?limit=10').set(auth(tokA)).expect(200);
      expect(h.body).toHaveLength(1);
      expect(h.body[0]).toMatchObject({ version: TEST, book: 'John', chapter: 3 });
      expect((await request(http()).get('/api/v1/reading/history').set(auth(tokB))).body).toEqual([]);

      await request(http()).get('/api/v1/reading/position').set(auth(tokB)).expect(404);
      const p = await request(http()).put('/api/v1/reading/position').set(auth(tokA)).send({ version: TEST, book: 'John', chapter: 3, verse: 16 }).expect(200);
      expect(p.body).toMatchObject({ version: TEST, book: 'John', chapter: 3, verse: 16 });
      expect((await request(http()).get('/api/v1/reading/position').set(auth(tokA)).expect(200)).body.verse).toBe(16);
    });

    it('ajustes, edición de perfil y exportación', async () => {
      const def = await request(http()).get('/api/v1/users/me/settings').set(auth(tokA)).expect(200);
      expect(def.body).toMatchObject({ theme: 'system', fontScale: 1, readingMode: 'chapter', parallelVersions: [] });
      const put = await request(http()).put('/api/v1/users/me/settings').set(auth(tokA)).send({ theme: 'sepia', parallelVersions: [TEST, TEST2] }).expect(200);
      expect(put.body).toMatchObject({ theme: 'sepia', parallelVersions: [TEST, TEST2] });
      await request(http()).put('/api/v1/users/me/settings').set(auth(tokA)).send({ theme: 'neon' }).expect(400);
      const patch = await request(http()).patch('/api/v1/users/me').set(auth(tokA)).send({ displayName: 'Ana M.' }).expect(200);
      expect(patch.body.displayName).toBe('Ana M.');
      const exp = await request(http()).get('/api/v1/users/me/export').set(auth(tokA)).expect(200);
      expect(exp.body.user.email).toBe(emailA);
      expect(exp.body.settings.theme).toBe('sepia');
      expect(JSON.stringify(exp.body)).not.toContain('passwordHash');
    });

    it('borrar cuenta exige contraseña y elimina los datos en cascada', async () => {
      await request(http()).delete('/api/v1/users/me').set(auth(tokB)).send({ password: 'otra-cosa-123456' }).expect(403);
      await request(http()).delete('/api/v1/users/me').set(auth(tokB)).send({ password: PASS }).expect(204);
      expect(await db.user.count({ where: { email: emailB } })).toBe(0);
    });
  });

  describe('Biblia (versión TEST)', () => {
    it('versiones y libros', async () => {
      const v = await request(http()).get('/api/v1/bible/versions').expect(200);
      const t = v.body.find((x: { code: string }) => x.code === TEST);
      expect(t.books).toEqual(['Gen', 'John']);
      expect(t.source.license).toBe('TEST');
      const b = await request(http()).get(`/api/v1/bible/versions/${TEST}/books`).expect(200);
      expect(b.body.map((x: { osis: string }) => x.osis)).toEqual(['Gen', 'John']);
      expect(b.body[1]).toMatchObject({ name: 'Juan', chapters: 2, testament: 'NT' });
      await request(http()).get('/api/v1/bible/versions/NOPE/books').expect(404);
    });

    it('capítulo con prev/next', async () => {
      const r = await request(http()).get(`/api/v1/bible/versions/${TEST}/chapters/John/3`).expect(200);
      expect(r.body.verses.map((v: { verse: number }) => v.verse)).toEqual([16, 17, 18]);
      expect(r.body.prev).toEqual({ book: 'Gen', chapter: 1 });
      expect(r.body.next).toEqual({ book: 'John', chapter: 4 });
      const g = await request(http()).get(`/api/v1/bible/versions/${TEST}/chapters/Gen/1`).expect(200);
      expect(g.body.prev).toBeNull();
      await request(http()).get(`/api/v1/bible/versions/${TEST}/chapters/John/99`).expect(404);
      await request(http()).get(`/api/v1/bible/versions/${TEST}/chapters/Inexistente/1`).expect(400);
    });

    it('paralelo alineado por versículo (null si falta)', async () => {
      const r = await request(http()).get(`/api/v1/bible/parallel/John/3?versions=${TEST},${TEST2}`).expect(200);
      expect(r.body.versions).toEqual([TEST, TEST2]);
      expect(r.body.rows).toEqual([
        { verse: 16, texts: { [TEST]: expect.stringContaining('amor'), [TEST2]: 'test love verse sixteen' } },
        { verse: 17, texts: { [TEST]: 'segundo versículo del amor', [TEST2]: null } },
        { verse: 18, texts: { [TEST]: 'tercer versículo', [TEST2]: 'test verse eighteen' } },
      ]);
      await request(http()).get(`/api/v1/bible/parallel/John/3?versions=${TEST}`).expect(400);
    });

    it('pasaje por referencia', async () => {
      const r = await request(http()).get(`/api/v1/bible/passage?ref=${encodeURIComponent('Jn 3,16-17')}&version=${TEST}`).expect(200);
      expect(r.body.reference).toMatchObject({ book: 'John', chapter: 3, verseStart: 16, verseEnd: 17 });
      expect(r.body.display).toBe('Jn 3,16-17');
      expect(r.body.verses).toHaveLength(2);
      await request(http()).get(`/api/v1/bible/passage?ref=${encodeURIComponent('Jn 3,99')}&version=${TEST}`).expect(404);
      await request(http()).get(`/api/v1/bible/passage?ref=basura&version=${TEST}`).expect(400);
    });

    it('offline con ETag y 304', async () => {
      const r = await request(http()).get(`/api/v1/bible/versions/${TEST}/offline`).expect(200);
      expect(r.headers.etag).toBeTruthy();
      expect(r.headers['cache-control']).toContain('max-age');
      expect(r.body.chapters.John['3']).toEqual([[16, expect.any(String)], [17, expect.any(String)], [18, expect.any(String)]]);
      expect(r.body.version.code).toBe(TEST);
      await request(http()).get(`/api/v1/bible/versions/${TEST}/offline`).set('If-None-Match', r.headers.etag!).expect(304);
    });
  });

  describe('búsqueda', () => {
    const q = (qs: string) => request(http()).get(`/api/v1/search?${qs}`);

    it('words', async () => {
      const r = await q(`q=prueba&versions=${TEST}`).expect(200);
      expect(r.body.total).toBe(3);
      expect(r.body.byBook).toEqual([{ book: 'Gen', count: 2 }, { book: 'John', count: 1 }]);
      expect(r.body.hits[0].snippet).toContain('<mark>prueba</mark>');
    });

    it('el snippet escapa el HTML del texto y conserva solo nuestras marcas', async () => {
      const r = await q(`q=amor&versions=${TEST}&book=John`).expect(200);
      const hit = r.body.hits.find((h: { verse: number }) => h.verse === 16);
      expect(hit.snippet).toContain('&lt;script&gt;');
      expect(hit.snippet).toContain('&amp;');
      expect(hit.snippet).toContain('&quot;comillas&quot;');
      expect(hit.snippet).not.toContain('<script>');
      expect(hit.snippet.replace(/<\/?mark>/g, '')).not.toMatch(/[<>]/);
      expect(hit.snippet).toContain('<mark>amor</mark>');
    });

    it('exact (frase) y fuzzy', async () => {
      const e = await q(`q=${encodeURIComponent('texto de prueba')}&mode=exact&versions=${TEST}`).expect(200);
      expect(e.body.total).toBe(2);
      const e2 = await q(`q=${encodeURIComponent('prueba texto')}&mode=exact&versions=${TEST}`).expect(200);
      expect(e2.body.total).toBe(0);
      const f = await q(`q=pruba&mode=fuzzy&versions=${TEST}`).expect(200);
      expect(f.body.total).toBeGreaterThanOrEqual(3);
    });

    it('filtros de testamento/libro y paginación', async () => {
      expect((await q(`q=prueba&versions=${TEST}&testament=NT`).expect(200)).body.total).toBe(1);
      expect((await q(`q=prueba&versions=${TEST}&testament=OT`).expect(200)).body.total).toBe(2);
      const p = await q(`q=prueba&versions=${TEST}&pageSize=1&page=2`).expect(200);
      expect(p.body.hits).toHaveLength(1);
      expect(p.body.total).toBe(3);
      await q('q=x&pageSize=1000').expect(400);
    });

    it('referencia detectada y entrada maliciosa inofensiva', async () => {
      const r = await q(`q=${encodeURIComponent('Jn 3,16')}`).expect(200);
      expect(r.body.reference).toMatchObject({ book: 'John', chapter: 3, verseStart: 16 });
      expect(r.body.hits).toEqual([]);
      const m = await q(`q=${encodeURIComponent(`'; DROP TABLE "User"; --`)}&versions=${TEST}`).expect(200);
      expect(m.body.total).toBe(0);
      expect(await db.user.count()).toBeGreaterThan(0);
    });
  });
});
