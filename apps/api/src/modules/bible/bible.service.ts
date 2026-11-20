import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  BibleVersionDto, BookDto, CANON, ChapterDto, OfflineBibleDto, ParallelChapterDto, PassageDto,
  ReferenceParseError, formatReference, parseReference,
} from '@bc/shared';
import { Prisma } from '@bc/db';
import { PrismaService } from '../../common/prisma.service';
import { requireBookParam } from '../../common/books';

type VersionRow = Prisma.BibleVersionGetPayload<{ include: { source: true } }>;

const osisPorId = (id: number) => CANON[id - 1]?.osis ?? String(id); // BibleBook.id = orden canónico 1..73

@Injectable()
export class BibleService {
  private offlineCache = new Map<string, { etag: string; body: OfflineBibleDto }>();

  constructor(private readonly prisma: PrismaService) {}

  private async version(code: string): Promise<VersionRow> {
    const v = await this.prisma.bibleVersion.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, isPublished: true },
      include: { source: true },
    });
    if (!v) throw new NotFoundException(`Versión "${code}" no encontrada`);
    return v;
  }

  private toVersionDto(v: VersionRow, bookIds: number[]): BibleVersionDto {
    return {
      code: v.code,
      name: v.name,
      language: v.language,
      edition: v.edition,
      versification: v.versification,
      books: bookIds.sort((a, b) => a - b).map(osisPorId),
      completeness: v.completeness === 'partial' ? 'partial' : 'complete',
      source: {
        id: v.source.id,
        name: v.source.name,
        license: v.source.license,
        licenseUrl: v.source.licenseUrl,
        provenanceUrl: v.source.provenanceUrl,
        retrievedAt: v.source.retrievedAt?.toISOString() ?? null,
        notes: v.source.notes,
      },
    };
  }

  async versions(): Promise<BibleVersionDto[]> {
    const [vs, grupos] = await Promise.all([
      this.prisma.bibleVersion.findMany({ where: { isPublished: true }, include: { source: true }, orderBy: { code: 'asc' } }),
      this.prisma.bibleChapter.groupBy({ by: ['versionId', 'bookId'] }),
    ]);
    return vs.map((v) =>
      this.toVersionDto(v, grupos.filter((g) => g.versionId === v.id).map((g) => g.bookId)),
    );
  }

  async books(code: string): Promise<BookDto[]> {
    const v = await this.version(code);
    const grupos = await this.prisma.bibleChapter.groupBy({
      by: ['bookId'],
      where: { versionId: v.id },
      _count: { chapter: true },
    });
    return grupos
      .sort((a, b) => a.bookId - b.bookId)
      .map((g) => {
        const c = CANON[g.bookId - 1]!;
        return {
          osis: c.osis,
          order: c.order,
          testament: c.testament,
          deuterocanonical: c.deuterocanonical,
          name: c.names.es,
          abbr: c.abbrEs,
          chapters: g._count.chapter,
        };
      });
  }

  async chapter(code: string, bookToken: string, chapter: number): Promise<ChapterDto> {
    const v = await this.version(code);
    const book = requireBookParam(bookToken);
    const verses = await this.prisma.bibleVerse.findMany({
      where: { versionId: v.id, bookId: book.order, chapter },
      orderBy: { verse: 'asc' },
      select: { verse: true, text: true },
    });
    if (verses.length === 0) throw new NotFoundException(`${book.names.es} ${chapter} no existe en ${v.code}`);
    const base = { versionId: v.id };
    const [prev, next] = await Promise.all([
      this.prisma.bibleChapter.findFirst({
        where: { ...base, OR: [{ bookId: { lt: book.order } }, { bookId: book.order, chapter: { lt: chapter } }] },
        orderBy: [{ bookId: 'desc' }, { chapter: 'desc' }],
      }),
      this.prisma.bibleChapter.findFirst({
        where: { ...base, OR: [{ bookId: { gt: book.order } }, { bookId: book.order, chapter: { gt: chapter } }] },
        orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }],
      }),
    ]);
    const nav = (c: { bookId: number; chapter: number } | null) =>
      c ? { book: osisPorId(c.bookId), chapter: c.chapter } : null;
    return { version: v.code, book: book.osis, chapter, verses, prev: nav(prev), next: nav(next) };
  }

  async parallel(bookToken: string, chapter: number, versionsParam: string): Promise<ParallelChapterDto> {
    const codes = [...new Set(versionsParam.split(',').map((s) => s.trim()).filter(Boolean))];
    if (codes.length < 2 || codes.length > 4) {
      throw new BadRequestException('Indica entre 2 y 4 versiones distintas en "versions"');
    }
    const book = requireBookParam(bookToken);
    const versions = await Promise.all(codes.map((c) => this.version(c)));
    const verses = await this.prisma.bibleVerse.findMany({
      where: { versionId: { in: versions.map((v) => v.id) }, bookId: book.order, chapter },
      select: { versionId: true, verse: true, text: true },
    });
    if (verses.length === 0) throw new NotFoundException(`${book.names.es} ${chapter} no existe en las versiones indicadas`);
    const codigoPorId = new Map(versions.map((v) => [v.id, v.code]));
    const filas = new Map<number, Record<string, string | null>>();
    for (const v of verses) {
      let fila = filas.get(v.verse);
      if (!fila) {
        fila = Object.fromEntries(versions.map((x) => [x.code, null]));
        filas.set(v.verse, fila);
      }
      fila[codigoPorId.get(v.versionId)!] = v.text;
    }
    return {
      book: book.osis,
      chapter,
      versions: versions.map((v) => v.code),
      rows: [...filas.entries()].sort((a, b) => a[0] - b[0]).map(([verse, texts]) => ({ verse, texts })),
    };
  }

  async passage(ref: string, versionCode?: string): Promise<PassageDto> {
    let parsed;
    try {
      parsed = parseReference(ref);
    } catch (e) {
      if (e instanceof ReferenceParseError) throw new BadRequestException(e.message);
      throw e;
    }
    const v = versionCode
      ? await this.version(versionCode)
      : await this.prisma.bibleVersion
          .findFirst({ where: { isPublished: true }, orderBy: { code: 'asc' }, include: { source: true } })
          .then((x) => x ?? Promise.reject(new NotFoundException('No hay versiones disponibles')));
    const book = CANON.find((b) => b.osis === parsed.book)!;
    const cEnd = parsed.chapterEnd ?? parsed.chapter;
    const vs = parsed.verseStart;
    const ve = parsed.verseEnd;

    let where: Prisma.BibleVerseWhereInput;
    if (vs === undefined) {
      where = { chapter: { gte: parsed.chapter, lte: cEnd } }; // capítulo(s) completo(s)
    } else if (ve === undefined) {
      where = { chapter: parsed.chapter, verse: vs }; // un versículo
    } else if (cEnd === parsed.chapter) {
      where = { chapter: parsed.chapter, verse: { gte: vs, lte: ve } };
    } else {
      where = {
        OR: [
          { chapter: parsed.chapter, verse: { gte: vs } },
          { chapter: { gt: parsed.chapter, lt: cEnd } },
          { chapter: cEnd, verse: { lte: ve } },
        ],
      };
    }
    const verses = await this.prisma.bibleVerse.findMany({
      where: { versionId: v.id, bookId: book.order, ...where },
      orderBy: [{ chapter: 'asc' }, { verse: 'asc' }],
      select: { chapter: true, verse: true, text: true },
    });
    if (verses.length === 0) throw new NotFoundException(`Pasaje "${formatReference(parsed)}" no encontrado en ${v.code}`);
    return { version: v.code, reference: parsed, display: formatReference(parsed), verses };
  }

  /** Exportación completa para uso sin conexión, con ETag y caché en memoria. */
  async offline(code: string): Promise<{ etag: string; load: () => Promise<OfflineBibleDto> }> {
    const v = await this.version(code);
    const etag = `"${createHash('sha256').update(`${v.code}${v.importedAt.toISOString()}`).digest('hex').slice(0, 32)}"`;
    return {
      etag,
      load: async () => {
        const hit = this.offlineCache.get(v.code);
        if (hit && hit.etag === etag) return hit.body;
        const [rows, grupos] = await Promise.all([
          this.prisma.bibleVerse.findMany({
            where: { versionId: v.id },
            orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
            select: { bookId: true, chapter: true, verse: true, text: true },
          }),
          this.prisma.bibleChapter.groupBy({ by: ['bookId'], where: { versionId: v.id } }),
        ]);
        const chapters: OfflineBibleDto['chapters'] = {};
        for (const r of rows) {
          const libro = (chapters[osisPorId(r.bookId)] ??= {});
          (libro[String(r.chapter)] ??= []).push([r.verse, r.text]);
        }
        const body: OfflineBibleDto = {
          version: this.toVersionDto(v, grupos.map((g) => g.bookId)),
          generatedAt: new Date().toISOString(),
          chapters,
        };
        this.offlineCache.set(v.code, { etag, body });
        return body;
      },
    };
  }
}
