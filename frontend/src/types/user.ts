/**
 * User types — mirror the real backend Users contract.
 *
 * Verified against:
 *  - backend/src/Interfaces/http/api/users/user.controller.ts
 *  - backend/src/Interfaces/http/api/users/dto/{create,update,user-query}.dto.ts
 *  - backend/src/Domains/users/UserRepository.ts (UserRecord, UserDetail, UserOutletRef)
 *  - backend/src/Domains/users/entities/RegisteredUser.ts
 *
 * Users are tenant-scoped and support full CRUD:
 *  - GET    /api/v1/users      → { success, data: User[], meta }  (PAGINATED)
 *  - GET    /api/v1/users/:id  → { success, data: UserDetail }
 *  - POST   /api/v1/users      → { success, data: CreatedUser }
 *  - PUT    /api/v1/users/:id  → { success, data: User }
 *  - DELETE /api/v1/users/:id  → { success, data: null }  (soft-delete)
 *
 * Note: the list row (UserRecord) carries `roleId` but NOT the role name; the
 * role name/code is only present on the detail (UserDetail).
 */

/** A user list row as serialized by the backend UserRecord. */
export interface User {
  id: string;
  companyId: string | null;
  roleId: string | null;
  name: string;
  email: string;
  phone: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** An outlet reference attached to a user's detail. */
export interface UserOutletRef {
  outletId: string;
  code: string;
  name: string;
  isActive: boolean;
}

/** User detail — a user plus its role labels and assigned outlets. */
export interface UserDetail extends User {
  roleCode: string | null;
  roleName: string | null;
  outlets: UserOutletRef[];
}

/** Value object returned after creating a user (no password ever exposed). */
export interface CreatedUser {
  id: string;
  name: string;
  email: string;
}

/** Query filters for the paginated user list. */
export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
  roleId?: string;
  /** Backend expects the string enum 'true' | 'false'. */
  isActive?: 'true' | 'false';
}

/** Create payload — password is required only on create. */
export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  roleId: string;
  outletIds?: string[];
}

/** Update payload — no password; outletIds is a full-sync replace. */
export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  roleId?: string;
  isActive?: boolean;
  outletIds?: string[];
}
