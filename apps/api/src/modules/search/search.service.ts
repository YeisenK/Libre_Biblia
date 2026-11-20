import { BadRequestException, Injectable } from '@nestjs/common';
import { SearchHitDto, SearchResultDto, tryParseReference } from '@bc/shared';
import { PrismaService } from '../../common/prisma.service';
import { requireBookParam } from '../../common/books';
import { SearchQueryDto } from './dto/search.dto';
import { SearchParams, buildByBookQuery, buildHitsQuery } from './search.query';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchQueryDto): Promise<SearchResultDto> {
    const q = dto.q.trim();
    if (!q) throw new BadRequestException('La consulta no puede estar vacía');
    const mode = dto.mode ?? 'words';
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 25;

    const reference = tryParseReference(q);
    if (reference) return { query: q, mode, reference, total: 0, byBook: [], hits: [], page, pageSize };

    let versionIds: string[] | null = null;
    if (dto.versions) {
      const codes = [...new Set(dto.versions.split(',').map((s) => s.trim()).filter(Boolean))];
      if (codes.length > 10) throw new BadRequestException('Demasiadas versiones');
      const vs = await this.prisma.bibleVersion.findMany({
        where: { isPublished: true, OR: codes.map((c) => ({ code: { equals: c, mode: 'insensitive' as const } })) },
        select: { id: true },
      });
      versionIds = vs.map((v) => v.id);
      if (versionIds.length === 0) return { query: q, mode, reference: null, total: 0, byBook: [], hits: [], page, pageSize };
    }

    const params: SearchParams = {
      q, mode, versionIds, page, pageSize,
      testament: dto.testament,
      bookId: dto.book ? requireBookParam(dto.book).order : undefined,
    };

    const [byBook, hits] = await Promise.all([
      this.prisma.$queryRaw<{ book: string; count: number }[]>(buildByBookQuery(params)),
      this.prisma.$queryRaw<(Omit<SearchHitDto, 'text'> & { text: string })[]>(buildHitsQuery(params)),
    ]);
    return {
      query: q,
      mode,
      reference: null,
      total: byBook.reduce((n, b) => n + b.count, 0),
      byBook: byBook.map((b) => ({ book: b.book, count: b.count })),
      hits: hits.map((h) => ({
        version: h.version, book: h.book, chapter: h.chapter, verse: h.verse, text: h.text, snippet: h.snippet,
      })),
      page,
      pageSize,
    };
  }
}
