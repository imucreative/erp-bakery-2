/**
 * Outlet types — mirror the real backend read contract.
 *
 * Verified against:
 *  - backend/src/Interfaces/http/api/outlets/outlet.controller.ts
 *  - backend/src/Domains/outlets/entities/Outlet.ts
 *
 * The list endpoint is paginated:
 *  - GET /api/v1/outlets → { success, data: Outlet[], meta }
 *
 * Only the read shape is modelled here; outlet CRUD is a separate module. This
 * type backs the outlet dropdown used when assigning outlets to a user.
 */

export interface Outlet {
  id: string;
  companyId: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Query filters for the paginated outlet list. */
export interface OutletListParams {
  page: number;
  limit: number;
  search?: string;
  /** Backend expects the string enum 'true' | 'false'. */
  isActive?: 'true' | 'false';
}
