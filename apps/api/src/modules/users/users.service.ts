import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserDto, UserSettingsDto } from '@bc/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuthService, toUserDto } from '../auth/auth.service';
import { PatchUserDto, UpdateSettingsDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private async require(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return u;
  }

  async me(id: string): Promise<UserDto> {
    return toUserDto(await this.require(id));
  }

  async patch(id: string, dto: PatchUserDto): Promise<UserDto> {
    await this.require(id);
    const u = await this.prisma.user.update({
      where: { id },
      data: dto.displayName !== undefined ? { displayName: dto.displayName.trim() || null } : {},
    });
    return toUserDto(u);
  }

  async remove(id: string, password: string): Promise<void> {
    const u = await this.require(id);
    if (!(await this.auth.verifyPassword(u.passwordHash, password))) {
      throw new ForbiddenException('Contraseña incorrecta');
    }
    await this.prisma.user.delete({ where: { id } }); // cascada: tokens, marcadores, historial, posición, ajustes
  }

  async export(id: string) {
    const u = await this.require(id);
    const [settings, bookmarks, history, position] = await Promise.all([
      this.getSettings(id),
      this.prisma.bookmark.findMany({ where: { userId: id }, include: { version: { select: { code: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.readingHistory.findMany({ where: { userId: id }, orderBy: { readAt: 'asc' } }),
      this.prisma.readingPosition.findUnique({ where: { userId: id } }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      user: toUserDto(u),
      settings,
      bookmarks: bookmarks.map((b) => ({
        version: b.version?.code ?? null,
        book: b.bookOsis,
        chapter: b.chapter,
        verse: b.verse,
        label: b.label,
        createdAt: b.createdAt.toISOString(),
      })),
      readingHistory: history.map((h) => ({
        version: h.versionCode,
        book: h.bookOsis,
        chapter: h.chapter,
        readAt: h.readAt.toISOString(),
      })),
      readingPosition: position && {
        version: position.versionCode,
        book: position.bookOsis,
        chapter: position.chapter,
        verse: position.verse,
        updatedAt: position.updatedAt.toISOString(),
      },
    };
  }

  async getSettings(userId: string): Promise<UserSettingsDto> {
    // upsert vacío: crea la fila con los valores por defecto del esquema si no existe
    const s = await this.prisma.userSettings.upsert({ where: { userId }, create: { userId }, update: {} });
    return this.toDto(s);
  }

  async putSettings(userId: string, dto: UpdateSettingsDto): Promise<UserSettingsDto> {
    const s = await this.prisma.userSettings.upsert({ where: { userId }, create: { userId, ...dto }, update: dto });
    return this.toDto(s);
  }

  private toDto(s: {
    theme: string; fontScale: number; lineHeight: number; margin: string; readingMode: string;
    defaultVersion: string | null; parallelVersions: string[];
  }): UserSettingsDto {
    return {
      theme: s.theme as UserSettingsDto['theme'],
      fontScale: s.fontScale,
      lineHeight: s.lineHeight,
      margin: s.margin as UserSettingsDto['margin'],
      readingMode: s.readingMode as UserSettingsDto['readingMode'],
      defaultVersion: s.defaultVersion,
      parallelVersions: s.parallelVersions,
    };
  }
}
