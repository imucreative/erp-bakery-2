import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AuthorizationError } from '../../../Commons/exceptions/AuthorizationError';
import { JwtAccessPayload } from '../../../Applications/security/TokenManager';
import { UserRepository } from '../../../Domains/users/UserRepository';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { SUPER_ADMIN_ONLY_KEY } from '../decorators/super-admin-only.decorator';

/**
 * PermissionsGuard
 *
 * Runs after JwtAuthGuard (which attaches request.user).
 * Checks that the authenticated user has ALL required permission codes,
 * and enforces platform-level routes marked with @SuperAdminOnly().
 *
 * Rules (from knowledge-base/16.role-permission-matrix.md):
 * - @SuperAdminOnly() routes require `is_super_admin = TRUE` and skip
 *   permission checks entirely.
 * - SUPER_ADMIN bypasses all permission checks.
 * - `module.manage` implies `module.read` — if a route requires `product.read`
 *   and the user has `product.manage`, access is granted.
 * - Authorization is always permission-based, NEVER role-code-based.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const superAdminOnly = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as FastifyRequest & { user: JwtAccessPayload }).user;

    // Platform-level route: only SUPER_ADMIN may pass, no permission code needed.
    if (superAdminOnly) {
      if (!user || !user.isSuperAdmin) {
        throw new AuthorizationError('AUTHORIZATION.ACCESS_DENIED');
      }

      // Platform console requires 2FA on the operator account (doc 55 §3.3).
      // Enrollment itself uses /auth/2fa/* which is NOT super-admin-only.
      const state = await this.userRepository.getTwoFactorStateById(user.sub);
      if (!state.enabled) {
        throw new AuthorizationError('AUTHORIZATION.MFA_REQUIRED');
      }

      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission() on this route — allow through
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

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
