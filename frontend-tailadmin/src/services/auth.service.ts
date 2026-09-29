/**
 * Auth + company service. Wraps the verified real endpoints (ADR doc 45 §4).
 * Each method returns the unwrapped `data` payload.
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface Company {
  id: string
  code: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  isActive: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthTokens> {
    const response = await httpClient.post<ApiSuccess<AuthTokens>>('/auth/login', payload)
    return response.data.data
  },

  async logout(refreshToken: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>('/auth/logout', {
      data: { refreshToken },
    })
  },

  async getCurrentCompany(): Promise<Company> {
    const response = await httpClient.get<ApiSuccess<Company>>('/companies/me')
    return response.data.data
  },
}
