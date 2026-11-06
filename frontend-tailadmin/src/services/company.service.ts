/**
 * Company service — profile of the CURRENT tenant company.
 * Verified against backend company.controller.ts:
 *  - GET /companies/me → { success, data: CompanyProfile | null }
 *  - PUT /companies/me → { success, data: CompanyProfile }   (requires company.manage)
 *
 * Platform-level tenant management lives in `platform-company.service.ts`.
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

/** Tenant company profile shown on the profile screen. */
export interface CompanyProfile {
  id: string
  code: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  country: string
  taxId: string | null
  logoUrl: string | null
  isActive: boolean
}

export interface UpdateCompanyProfilePayload {
  name?: string
  address?: string | null
  phone?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  country?: string
  taxId?: string | null
  logoUrl?: string | null
}

export const companyService = {
  /** Current user's company profile (tenant scope). */
  async getMyCompany(): Promise<CompanyProfile | null> {
    const response = await httpClient.get<ApiSuccess<CompanyProfile | null>>('/companies/me')
    return response.data.data
  },

  /** Update the current user's company profile (requires company.manage). */
  async updateMyCompany(payload: UpdateCompanyProfilePayload): Promise<CompanyProfile> {
    const response = await httpClient.put<ApiSuccess<CompanyProfile>>('/companies/me', payload)
    return response.data.data
  },
}
