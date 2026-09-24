import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AuthorizationError } from '../../../Commons/exceptions/AuthorizationError';
import { JwtAccessPayload } from '../../../Applications/security/TokenManager';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

/**
 * PermissionsGuard
 *
 * Runs after JwtAuthGuard (which attaches request.user).
 * Checks that the authenticated user has ALL required permission codes.
 *
 * Rules (from knowledge-base/16.role-permission-matrix.md):
 * - SUPER_ADMIN bypasses all permission checks.
 * - `module.manage` implies `module.read` — if a route requires `product.read`
 *   and the user has `product.manage`, access is granted.
 * - Authorization is always permission-based, NEVER role-code-based.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission() on this route — allow through
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as FastifyRequest & { user: JwtAccessPayload }).user;

    // JwtAuthGuard guarantees user is attached; this is a safety net
    if (!user) {
      throw new AuthorizationError('AUTHORIZATION.ACCESS_DENIED');
    }

    // SUPER_ADMIN bypasses all permission checks
    if (user.isSuperAdmin) return true;

    const userPermissions = new Set(user.permissions ?? []);

    const hasAll = requiredPermissions.every((required) => {
      // Direct match
      if (userPermissions.has(required)) return true;

      // manage implies read: if route needs `product.read`,
      // user having `product.manage` satisfies it
      if (required.endsWith('.read')) {
        const manageVariant = required.replace(/\.read$/, '.manage');
        return userPermissions.has(manageVariant);
      }

      return false;
    });

    if (!hasAll) {
      throw new AuthorizationError('AUTHORIZATION.ACCESS_DENIED');
    }

    return true;
  }
}
