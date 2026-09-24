import { SetMetadata } from '@nestjs/common';

/**
 * @RequirePermission(...permissions)
 * Declares the permission codes required to access a route.
 * Evaluated by PermissionsGuard.
 *
 * Usage:
 *   @RequirePermission('product.read')
 *   @RequirePermission('product.manage')
 *   @RequirePermission('sales.manage', 'shift.manage')  // require ALL
 *
 * Rules (role-permission-matrix.md):
 * - Always use permission strings, NEVER role codes.
 * - manage implies read — guard handles this automatically.
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
