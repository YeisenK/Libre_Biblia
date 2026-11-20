import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthResponseDto, UserDto } from '@bc/shared';
import { PrismaService } from '../../common/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

export const toUserDto = (u: { id: string; email: string; displayName: string | null; createdAt: Date }): UserDto => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  createdAt: u.createdAt.toISOString(),
});

const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly refresh: RefreshTokenService,
  ) {}

  hashPassword(p: string) {
    return argon2.hash(p, ARGON_OPTS);
  }

  async verifyPassword(hash: string, p: string) {
    try {
      return await argon2.verify(hash, p);
    } catch {
      return false;
    }
  }

  private signAccess(u: { id: string; email: string }) {
    return this.jwt.signAsync({ sub: u.id, email: u.email });
  }

  async register(email: string, password: string, displayName: string | undefined, ua?: string) {
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Ya existe una cuenta con ese correo electrónico');
    }
    const user = await this.prisma.user
      .create({ data: { email, passwordHash: await this.hashPassword(password), displayName: displayName?.trim() || null } })
      .catch((e: { code?: string }) => {
        if (e.code === 'P2002') throw new ConflictException('Ya existe una cuenta con ese correo electrónico');
        throw e;
      });
    return this.startSession(user, ua);
  }

  async login(email: string, password: string, ua?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Con usuario inexistente se verifica contra un hash falso para igualar tiempos de respuesta.
    const hash = user?.passwordHash ?? (await (this.dummyHash ??= this.hashPassword('contraseña-ficticia-no-valida')));
    const ok = await this.verifyPassword(hash, password);
    if (!user || !ok) throw new UnauthorizedException('Credenciales incorrectas');
    return this.startSession(user, ua);
  }

  private async startSession(user: { id: string; email: string; displayName: string | null; createdAt: Date }, ua?: string) {
    const rt = await this.refresh.issue(user.id, undefined, ua);
    return this.build(user, rt.token, rt.expiresAt);
  }

  async refreshSession(rawToken: string, ua?: string) {
    const rt = await this.refresh.rotate(rawToken, ua);
    const user = await this.prisma.user.findUnique({ where: { id: rt.userId } });
    if (!user) throw new UnauthorizedException('Sesión no válida');
    return this.build(user, rt.token, rt.expiresAt);
  }

  logout(rawToken: string | undefined) {
    return rawToken ? this.refresh.revoke(rawToken) : Promise.resolve();
  }

  private async build(
    user: { id: string; email: string; displayName: string | null; createdAt: Date },
    refreshToken: string,
    expiresAt: Date,
  ): Promise<{ body: AuthResponseDto; refreshToken: string; expiresAt: Date }> {
    return {
      body: { accessToken: await this.signAccess(user), user: toUserDto(user) },
      refreshToken,
      expiresAt,
    };
  }
}
