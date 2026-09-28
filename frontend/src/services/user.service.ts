/**
 * User service — wraps the tenant-scoped Users endpoints (verified in
 * backend/src/Interfaces/http/api/users/user.controller.ts). Each method
 * returns the unwrapped payload from the success envelope.
 *
 * The list endpoint IS paginated: the response is `{ success, data: User[], meta }`
 * (ADR doc 45 §4), so `list` returns both the rows and the pagination meta.
 */

import { httpClient } from '@/lib/api';
import type { ApiListResponse, ApiSuccess, ListMeta } from '@/types/api';
import type {
  CreateUserPayload,
  CreatedUser,
  UpdateUserPayload,
  User,
  UserDetail,
  UserListParams,
} from '@/types/user';

export interface UserListResult {
  items: User[];
  meta: ListMeta;
}

/** Builds a query object with only the provided (non-empty) filters. */
function toQueryParams(params: UserListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search) {
    query.search = params.search;
  }
  if (params.roleId) {
    query.roleId = params.roleId;
  }
  if (params.isActive !== undefined) {
    query.isActive = params.isActive;
  }
  return query;
}

export const userService = {
  /** List users for the acting user's company (paginated + filtered). */
  async list(params: UserListParams): Promise<UserListResult> {
    const response = await httpClient.get<ApiListResponse<User>>('/users', {
      params: toQueryParams(params),
    });
    return { items: response.data.data, meta: response.data.meta };
  },

  /** Fetch a single user with role labels and assigned outlets. */
  async getById(id: string): Promise<UserDetail> {
    const response = await httpClient.get<ApiSuccess<UserDetail>>(`/users/${id}`);
    return response.data.data;
  },

  /** Create/invite a user in the current company. */
  async create(payload: CreateUserPayload): Promise<CreatedUser> {
    const response = await httpClient.post<ApiSuccess<CreatedUser>>('/users', payload);
    return response.data.data;
  },

  /** Update a user, reassign role or outlets (outletIds is a full-sync replace). */
  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    const response = await httpClient.put<ApiSuccess<User>>(`/users/${id}`, payload);
    return response.data.data;
  },

  /** Soft-delete a user. */
  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/users/${id}`);
  },
};
