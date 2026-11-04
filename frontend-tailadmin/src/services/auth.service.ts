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

/**
 * First login step result. When 2FA is enabled the server issues NO tokens —
 * it returns a short-lived MFA challenge instead (see `verifyMfa`).
 */
export type LoginResult =
  | { mfaRequired: true; mfaToken: string }
  | ({ mfaRequired: false } & AuthTokens)

export interface TwoFactorStatus {
  enabled: boolean
  pending: boolean
}

export interface TwoFactorSetup {
  secret: string
  otpauthUri: string
  recoveryCodes: string[]
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

export interface RegisterCompanyPayload {
  name: string
  slug: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  phone?: string
  address?: string
}

export interface RegisterCompanyResult {
  company: Company
  owner: {
    id: string
    name: string
    email: string
  }
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const response = await httpClient.post<ApiSuccess<LoginResult>>('/auth/login', payload)
    return response.data.data
  },

  /** Second login step: exchange the MFA challenge + code for real tokens. */
  async verifyMfa(payload: { mfaToken: string; code: string }): Promise<AuthTokens> {
    const response = await httpClient.post<ApiSuccess<AuthTokens>>('/auth/mfa/verify', payload)
    return response.data.data
  },

  async getTwoFactorStatus(): Promise<TwoFactorStatus> {
    const response = await httpClient.get<ApiSuccess<TwoFactorStatus>>('/auth/2fa/status')
    return response.data.data
  },

  async setupTwoFactor(): Promise<TwoFactorSetup> {
    const response = await httpClient.post<ApiSuccess<TwoFactorSetup>>('/auth/2fa/setup', {})
    return response.data.data
  },

  async enableTwoFactor(code: string): Promise<void> {
    await httpClient.post<ApiSuccess<null>>('/auth/2fa/enable', { code })
  },

  async disableTwoFactor(code: string): Promise<void> {
    await httpClient.post<ApiSuccess<null>>('/auth/2fa/disable', { code })
  },

  /**
   * Public SaaS registration: creates a Company plus its owner user in one call.
   * No token is returned, so callers must NOT auto-login — redirect to /signin.
   */
  async registerCompany(payload: RegisterCompanyPayload): Promise<RegisterCompanyResult> {
    const response = await httpClient.post<ApiSuccess<RegisterCompanyResult>>(
      '/companies/register',
      payload,
    )
    return response.data.data
  },

  async logout(refreshToken: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>('/auth/logout', {
      data: { refreshToken },
    })
  },
}
