import { Body, Controller, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthResponseDto } from '@bc/shared';
import { getConfig } from '../../common/config';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RefreshBodyDto, RegisterDto } from './dto/auth.dto';

export const COOKIE_NAME = 'bc_rt';
const estricto = { default: { limit: () => getConfig().THROTTLE_AUTH_LIMIT, ttl: 60_000 } };

@ApiTags('auth')
@Public()
@Throttle(estricto)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private esNativo(req: Request) {
    return req.headers['x-client'] === 'native';
  }

  private emitir(
    req: Request,
    res: Response,
    r: { body: AuthResponseDto; refreshToken: string; expiresAt: Date },
  ): AuthResponseDto {
    if (this.esNativo(req)) return { ...r.body, refreshToken: r.refreshToken };
    res.cookie(COOKIE_NAME, r.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: getConfig().isProd,
      path: '/api/v1/auth',
      expires: r.expiresAt,
    });
    return r.body;
  }

  private tokenDe(req: Request, body: RefreshBodyDto): string | undefined {
    const c = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME];
    return this.esNativo(req) ? body.refreshToken ?? c : c ?? body.refreshToken;
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.emitir(req, res, await this.auth.register(dto.email, dto.password, dto.displayName, req.headers['user-agent']));
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.emitir(req, res, await this.auth.login(dto.email, dto.password, req.headers['user-agent']));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshBodyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.tokenDe(req, body);
    if (!token) {
      throw new UnauthorizedException('Falta el token de sesión');
    }
    return this.emitir(req, res, await this.auth.refreshSession(token, req.headers['user-agent']));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: RefreshBodyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.tokenDe(req, body));
    res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
  }
}
