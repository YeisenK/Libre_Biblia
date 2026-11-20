import { Injectable, NotFoundException } from '@nestjs/common';
import { ReadingPositionDto } from '@bc/shared';
import { PrismaService } from '../../common/prisma.service';
import { requireBookParam } from '../../common/books';
import { HistoryEntryDto, PositionDto } from './dto/reading.dto';

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Una entrada por (versión, libro, capítulo): releer un capítulo solo actualiza su fecha. */
  async addHistory(userId: string, dto: HistoryEntryDto): Promise<void> {
    const book = requireBookParam(dto.book).osis;
    await this.prisma.$transaction([
      this.prisma.readingHistory.deleteMany({ where: { userId, versionCode: dto.version, bookOsis: book, chapter: dto.chapter } }),
      this.prisma.readingHistory.create({ data: { userId, versionCode: dto.version, bookOsis: book, chapter: dto.chapter } }),
    ]);
  }

  async history(userId: string, limit = 50) {
    const rows = await this.prisma.readingHistory.findMany({ where: { userId }, orderBy: { readAt: 'desc' }, take: limit });
    return rows.map((r) => ({ version: r.versionCode, book: r.bookOsis, chapter: r.chapter, readAt: r.readAt.toISOString() }));
  }

  async getPosition(userId: string): Promise<ReadingPositionDto> {
    const p = await this.prisma.readingPosition.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException('Aún no hay posición de lectura guardada');
    return this.toDto(p);
  }

  async putPosition(userId: string, dto: PositionDto): Promise<ReadingPositionDto> {
    const data = { versionCode: dto.version, bookOsis: requireBookParam(dto.book).osis, chapter: dto.chapter, verse: dto.verse ?? null };
    const p = await this.prisma.readingPosition.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return this.toDto(p);
  }

  private toDto(p: { versionCode: string; bookOsis: string; chapter: number; verse: number | null; updatedAt: Date }): ReadingPositionDto {
    return { version: p.versionCode, book: p.bookOsis, chapter: p.chapter, verse: p.verse, updatedAt: p.updatedAt.toISOString() };
  }
}
