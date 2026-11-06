import { SetMetadata } from '@nestjs/common';

/**
 * @SuperAdminOnly()
 * Declares a route as platform-level: only users with `is_super_admin = TRUE`
 * may access it. Evaluated by PermissionsGuard (no permission code needed).
 *
 * Usage:
 *   @SuperAdminOnly()
 *
 * Rules:
 * - Platform routes are NEVER permission-code based — the super admin does not
 *   belong to any company, so tenant permissions do not apply to it.
 * - Use it for tenant management (companies, platform users) only. Tenant
 *   endpoints must keep using @RequirePermission().
 */
export const SUPER_ADMIN_ONLY_KEY = 'superAdminOnly';
export const SuperAdminOnly = () => SetMetadata(SUPER_ADMIN_ONLY_KEY, true);
