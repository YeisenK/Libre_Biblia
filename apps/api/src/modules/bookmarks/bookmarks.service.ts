import { Injectable, NotFoundException } from '@nestjs/common';
import { BookmarkDto } from '@bc/shared';
import { PrismaService } from '../../common/prisma.service';
import { requireBookParam } from '../../common/books';
import { CreateBookmarkDto } from './dto/bookmarks.dto';

type Row = { id: string; bookOsis: string; chapter: number; verse: number | null; label: string | null; createdAt: Date; version: { code: string } | null };
const include = { version: { select: { code: true } } } as const;
const toDto = (b: Row): BookmarkDto => ({
  id: b.id, version: b.version?.code ?? null, book: b.bookOsis, chapter: b.chapter, verse: b.verse,
  label: b.label, createdAt: b.createdAt.toISOString(),
});

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.bookmark.findMany({ where: { userId }, include, orderBy: { createdAt: 'desc' }, take: 1000 });
    return rows.map(toDto);
  }

  async create(userId: string, dto: CreateBookmarkDto): Promise<BookmarkDto> {
    const book = requireBookParam(dto.book);
    let versionId: string | null = null;
    if (dto.version) {
      const v = await this.prisma.bibleVersion.findFirst({ where: { code: { equals: dto.version, mode: 'insensitive' } } });
      if (!v) throw new NotFoundException(`Versión "${dto.version}" no encontrada`);
      versionId = v.id;
    }
    const verse = dto.verse ?? null;
    // El índice único no cubre verse NULL (Postgres trata los NULL como distintos): se comprueba a mano.
    const existente = await this.prisma.bookmark.findFirst({
      where: { userId, bookOsis: book.osis, chapter: dto.chapter, verse }, include,
    });
    if (existente) return toDto(existente);
    const b = await this.prisma.bookmark.create({
      data: { userId, versionId, bookOsis: book.osis, chapter: dto.chapter, verse, label: dto.label?.trim() || null },
      include,
    });
    return toDto(b);
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.bookmark.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Marcador no encontrado');
  }
}
