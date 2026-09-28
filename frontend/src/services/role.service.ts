/**
 * Role service — wraps the read-only Roles endpoints (verified in
 * backend/src/Interfaces/http/api/roles/role.controller.ts). Each method
 * returns the unwrapped `data` payload from the success envelope.
 *
 * The list endpoint is NOT paginated: `data` is the role array directly.
 */

import { httpClient } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { Role, RoleDetail } from '@/types/role';

export const roleService = {
  /** List all roles for the acting user's company. */
  async list(): Promise<Role[]> {
    const response = await httpClient.get<ApiSuccess<Role[]>>('/roles');
    return response.data.data;
  },

  /** Fetch a single role with its assigned permission codes. */
  async getById(id: string): Promise<RoleDetail> {
    const response = await httpClient.get<ApiSuccess<RoleDetail>>(`/roles/${id}`);
    return response.data.data;
  },
};
