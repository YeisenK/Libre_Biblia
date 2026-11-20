process.env.DATABASE_URL = 'postgresql://x';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(40);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(40);

import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService, hashToken } from './refresh-token.service';

interface Row { id: string; userId: string; tokenHash: string; familyId: string; expiresAt: Date; revokedAt: Date | null; userAgent: string | null }

/** Prisma mínimo en memoria: solo lo que usa RefreshTokenService. */
function fakePrisma() {
  const rows: Row[] = [];
  let n = 0;
  const prisma = {
    refreshToken: {
      create: async ({ data }: { data: Omit<Row, 'id' | 'revokedAt'> }) => {
        const r = { ...data, id: String(++n), revokedAt: null };
        rows.push(r);
        return r;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => rows.find((r) => r.tokenHash === where.tokenHash) ?? null,
      updateMany: async ({ where, data }: { where: { id?: string; familyId?: string; revokedAt: null }; data: { revokedAt: Date } }) => {
        const m = rows.filter((r) => (where.id ? r.id === where.id : r.familyId === where.familyId) && r.revokedAt === null);
        m.forEach((r) => (r.revokedAt = data.revokedAt));
        return { count: m.length };
      },
    },
  };
  return { prisma, rows };
}

describe('RefreshTokenService', () => {
  it('guarda solo el hash sha256 del token, nunca el token', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new RefreshTokenService(prisma as never);
    const t = await svc.issue('u1');
    expect(rows[0]!.tokenHash).toBe(hashToken(t.token));
    expect(rows[0]!.tokenHash).not.toContain(t.token);
    expect(Buffer.from(t.token, 'base64url').length).toBe(32);
  });

  it('rota: revoca el token usado y emite otro de la misma familia', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new RefreshTokenService(prisma as never);
    const t1 = await svc.issue('u1');
    const t2 = await svc.rotate(t1.token);
    expect(t2.token).not.toBe(t1.token);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.revokedAt).not.toBeNull();
    expect(rows[1]!.revokedAt).toBeNull();
    expect(rows[1]!.familyId).toBe(rows[0]!.familyId);
  });

  it('reutilizar un token revocado revoca toda la familia', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new RefreshTokenService(prisma as never);
    const t1 = await svc.issue('u1');
    const t2 = await svc.rotate(t1.token);
    await expect(svc.rotate(t1.token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
    await expect(svc.rotate(t2.token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('no afecta a otras familias', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new RefreshTokenService(prisma as never);
    const a = await svc.issue('u1');
    const b = await svc.issue('u1');
    await svc.rotate(a.token);
    await expect(svc.rotate(a.token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rows.find((r) => r.tokenHash === hashToken(b.token))!.revokedAt).toBeNull();
  });

  it('rechaza tokens desconocidos y caducados', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new RefreshTokenService(prisma as never);
    await expect(svc.rotate('no-existe')).rejects.toBeInstanceOf(UnauthorizedException);
    const t = await svc.issue('u1');
    rows[0]!.expiresAt = new Date(Date.now() - 1000);
    await expect(svc.rotate(t.token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('dos rotaciones simultáneas del mismo token: solo una gana y la familia se revoca', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new RefreshTokenService(prisma as never);
    const t = await svc.issue('u1');
    const r = await Promise.allSettled([svc.rotate(t.token), svc.rotate(t.token)]);
    expect(r.filter((x) => x.status === 'fulfilled').length).toBeLessThanOrEqual(1);
    expect(rows.filter((x) => x.revokedAt === null).length).toBeLessThanOrEqual(1);
  });

  it('logout revoca la familia', async () => {
    const { prisma, rows } = fakePrisma();
    const svc = new RefreshTokenService(prisma as never);
    const t1 = await svc.issue('u1');
    const t2 = await svc.rotate(t1.token);
    await svc.revoke(t2.token);
    expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
    await expect(svc.revoke('desconocido')).resolves.toBeUndefined();
  });
});
