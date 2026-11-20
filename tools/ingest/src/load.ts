import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANON } from '@bc/shared';
import { PKG_ROOT, outFile, reportFile } from './paths';
import { readManifest } from './download';
import type { CanonicalBible, SourceSpec } from './types';
import type { ValidationReport } from './validate';

const BATCH = 2000;

function loadEnv(): void {
  if (process.env.DATABASE_URL) return;
  const p = join(PKG_ROOT, '..', '..', '.env');
  if (existsSync(p)) process.loadEnvFile(p);
}

export async function loadSources(sources: SourceSpec[]): Promise<void> {
  loadEnv();
  const { PrismaClient } = await import('@bc/db');
  const prisma = new PrismaClient();
  try {
    const books = await prisma.bibleBook.findMany({ select: { id: true, osis: true } });
    const bookId = new Map(books.map((b) => [b.osis, b.id]));
    for (const b of CANON) if (!bookId.has(b.osis)) throw new Error(`BibleBook ${b.osis} no sembrado; ejecuta pnpm db:seed`);

    for (const src of sources) {
      const report = JSON.parse(readFileSync(reportFile(src.code), 'utf8')) as ValidationReport;
      if (report.errors.length) throw new Error(`[${src.code}] la validación tiene errores; no se carga`);
      const bible = JSON.parse(readFileSync(outFile(src.code), 'utf8')) as CanonicalBible;
      const manifest = readManifest(src.code);
      const main = manifest.files[0]!;

      const source = await prisma.source.upsert({
        where: { key: src.key },
        create: {
          key: src.key, name: src.name, license: src.license, licenseUrl: src.licenseUrl,
          provenanceUrl: src.provenanceUrl, retrievedAt: new Date(main.retrievedAt), checksum: main.sha256, notes: src.notes ?? null,
        },
        update: {
          name: src.name, license: src.license, licenseUrl: src.licenseUrl, provenanceUrl: src.provenanceUrl,
          retrievedAt: new Date(main.retrievedAt), checksum: main.sha256, notes: src.notes ?? null,
        },
      });
      const vdata = {
        name: src.name, language: src.language, edition: src.edition, versification: src.versification,
        tsConfig: src.tsConfig, completeness: src.completeness, sourceId: source.id,
      };
      const version = await prisma.bibleVersion.upsert({
        where: { code: src.code }, create: { code: src.code, ...vdata }, update: { ...vdata, importedAt: new Date() },
      });

      const chapterRows: { versionId: string; bookId: number; chapter: number; verseCount: number }[] = [];
      const verseRows: { versionId: string; bookId: number; chapter: number; verse: number; text: string; tsConfig: string }[] = [];
      for (const b of CANON) {
        const book = bible.books[b.osis];
        if (!book) continue;
        for (const [ch, verses] of Object.entries(book)) {
          chapterRows.push({ versionId: version.id, bookId: b.order, chapter: Number(ch), verseCount: verses.length });
          for (const [v, text] of verses) {
            verseRows.push({ versionId: version.id, bookId: b.order, chapter: Number(ch), verse: v, text, tsConfig: src.tsConfig });
          }
        }
      }
      await prisma.$transaction(async (tx) => {
        await tx.bibleVerse.deleteMany({ where: { versionId: version.id } });
        await tx.bibleChapter.deleteMany({ where: { versionId: version.id } });
        for (let i = 0; i < chapterRows.length; i += BATCH) await tx.bibleChapter.createMany({ data: chapterRows.slice(i, i + BATCH) });
        for (let i = 0; i < verseRows.length; i += BATCH) await tx.bibleVerse.createMany({ data: verseRows.slice(i, i + BATCH) });
      }, { timeout: 600_000, maxWait: 30_000 });
      console.log(`[${src.code}] cargado: ${chapterRows.length} capítulos, ${verseRows.length} versículos`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
