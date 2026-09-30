/**
 * Payment Term service — tenant-scoped CRUD for payment terms.
 * Verified against the backend Payment Term contract (final).
 *
 *  - GET    /payment-terms         → { success, data: PaymentTerm[], meta } (paginated)
 *  - GET    /payment-terms/lookup  → { success, data: PaymentTerm[] } (active-only)
 *  - GET    /payment-terms/:id     → { success, data: PaymentTerm }
 *  - POST   /payment-terms         → { code, name, dueDays }        (409 when code duplicate)
 *  - PUT    /payment-terms/:id     → { name?, dueDays?, isActive? } (code immutable)
 *  - DELETE /payment-terms/:id     → soft-delete (409 when in use)
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

interface ListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiListResponse<T> {
  success: true
  data: T[]
  meta: ListMeta
}

export interface PaymentTerm {
  id: string
  companyId: string | null
  code: string
  name: string
  dueDays: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PaymentTermListParams {
  page: number
  limit: number
  search?: string
  isActive?: 'true' | 'false'
}

export interface PaymentTermListResult {
  items: PaymentTerm[]
  meta: ListMeta
}

export interface CreatePaymentTermPayload {
  code: string
  name: string
  dueDays: number
}

export interface UpdatePaymentTermPayload {
  name?: string
  dueDays?: number
  isActive?: boolean
}

function toQuery(params: PaymentTermListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.search) {
    query.search = params.search
  }
  if (params.isActive !== undefined) {
    query.isActive = params.isActive
  }
  return query
}

export const paymentTermService = {
  async list(params: PaymentTermListParams): Promise<PaymentTermListResult> {
    const response = await httpClient.get<ApiListResponse<PaymentTerm>>('/payment-terms', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async lookup(): Promise<PaymentTerm[]> {
    const response = await httpClient.get<ApiSuccess<PaymentTerm[]>>('/payment-terms/lookup')
    return response.data.data
  },

  async create(payload: CreatePaymentTermPayload): Promise<PaymentTerm> {
    const response = await httpClient.post<ApiSuccess<PaymentTerm>>('/payment-terms', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdatePaymentTermPayload): Promise<PaymentTerm> {
    const response = await httpClient.put<ApiSuccess<PaymentTerm>>(`/payment-terms/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/payment-terms/${id}`)
  },
}
