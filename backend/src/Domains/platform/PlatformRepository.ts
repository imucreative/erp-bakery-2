/**
 * Platform-level (cross-tenant) read repository.
 *
 * Only used by the platform console (SUPER_ADMIN). Tenant-scoped reads stay in
 * their own domain repositories — this one exists because a super admin has no
 * company context and therefore cannot use the tenant-scoped queries.
 *
 * Operational data remains tenant-owned. Identity and access mutations are
 * explicitly supported here because they are platform responsibilities.
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

export interface PlatformRoleItem {
  id: string;
  companyId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface PlatformUserUpdateFields {
  name?: string;
  phone?: string | null;
  companyId?: string;
  roleId?: string;
  isActive?: boolean;
}

export abstract class PlatformRepository {
  /**
   * List users across all companies (or a single one when `companyId` is set).
   * Soft-deleted users are excluded; super admins are listed first.
   */
  abstract listUsers(params: PlatformUserListParams): Promise<PlatformUserListResult>;

  abstract listRoles(companyId: string): Promise<PlatformRoleItem[]>;

  abstract updateUser(
    id: string,
    fields: PlatformUserUpdateFields,
    actorId: string,
  ): Promise<PlatformUserItem>;

  abstract softDeleteUser(id: string, actorId: string): Promise<void>;

  abstract recordAudit(
    actorId: string,
    action: string,
    entityId: string,
    companyId: string | null,
    oldValue?: unknown,
    newValue?: unknown,
  ): Promise<void>;
}
