import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { TokenManager } from '../../../Applications/security/TokenManager';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard
 *
 * Applied globally in AppModule.
 * - Routes decorated with @Public() are skipped.
 * - All other routes require a valid Bearer access token.
 * - Decoded payload is attached to request.user for downstream use.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenManager: TokenManager,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow @Public() routes through without token check
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this._extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Access token tidak ditemukan');
    }

    try {
      const payload = await this.tokenManager.verifyAccessToken(token);
      // Attach decoded payload to request so @GetUser() can read it
      (request as FastifyRequest & { user: typeof payload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Access token tidak valid atau sudah kadaluarsa');
    }
  }

  private _extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string') return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
