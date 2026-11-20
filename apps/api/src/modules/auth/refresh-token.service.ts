import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma.service';
import { getConfig } from '../../common/config';

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export interface RefreshIssued {
  token: string;
  expiresAt: Date;
  userId: string;
}

/**
 * Refresh tokens opacos (32 bytes aleatorios) guardados como sha256.
 * Rotación por familia: cada uso revoca el token y emite otro de la misma familia;
 * reutilizar un token ya revocado revoca la familia completa.
 */
@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string, familyId: string = randomUUID(), userAgent?: string): Promise<RefreshIssued> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + getConfig().JWT_REFRESH_TTL_DAYS * 86_400_000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(token), familyId, expiresAt, userAgent: userAgent?.slice(0, 255) ?? null },
    });
    return { token, expiresAt, userId };
  }

  /** Valida y rota. Lanza 401 si es desconocido, caducado o reutilizado. */
  async rotate(rawToken: string, userAgent?: string): Promise<RefreshIssued> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!row) throw new UnauthorizedException('Sesión no válida');
    if (row.revokedAt) {
      await this.revokeFamily(row.familyId); // reuso detectado
      throw new UnauthorizedException('Sesión no válida');
    }
    if (row.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Sesión caducada');
    // Revocación atómica: si dos peticiones usan el mismo token, solo una gana.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException('Sesión no válida');
    }
    return this.issue(row.userId, row.familyId, userAgent);
  }

  /** Cierra la sesión (familia) a la que pertenece el token. Silencioso si no existe. */
  async revoke(rawToken: string): Promise<void> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (row) await this.revokeFamily(row.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
