/**
 * Platform-level (cross-tenant) read repository.
 *
 * Only used by the platform console (SUPER_ADMIN). Tenant-scoped reads stay in
 * their own domain repositories — this one exists because a super admin has no
 * company context and therefore cannot use the tenant-scoped queries.
 *
 * Read-only by design: the platform console must not mutate tenant data.
 */

export interface PlatformUserListParams {
  page: number;
  limit: number;
  search?: string;
  companyId?: string;
}

export interface PlatformUserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  companyId: string | null;
  companyName: string | null;
  roleId: string | null;
  roleName: string | null;
  roleCode: string | null;
  createdAt: string;
}

export interface PlatformUserListResult {
  rows: PlatformUserItem[];
  total: number;
}

export abstract class PlatformRepository {
  /**
   * List users across all companies (or a single one when `companyId` is set).
   * Soft-deleted users are excluded; super admins are listed first.
   */
  abstract listUsers(params: PlatformUserListParams): Promise<PlatformUserListResult>;
}
