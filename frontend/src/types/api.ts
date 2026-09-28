/**
 * Shared API envelope types. Verified against the real backend contract in
 * ADR doc 45 §4 (doc 8 is inaccurate for these).
 */

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** List envelope — `data` is the array directly (ADR doc 45 §4). */
export interface ApiListResponse<T> {
  success: true;
  message?: string;
  data: T[];
  meta: ListMeta;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Company {
  id: string;
  code: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}
