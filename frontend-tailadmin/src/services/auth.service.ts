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
  /** Keep the session after the browser closes (localStorage + longer refresh TTL). */
  rememberMe?: boolean
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

export interface ForgotPasswordResult {
  /** Hanya terisi di luar produksi (backend: AUTH_EXPOSE_RESET_LINK=true). */
  resetLink: string | null
}

export const authService = {
  /**
   * Minta tautan reset password. Selalu berhasil — backend sengaja tidak
   * membocorkan apakah email terdaftar atau tidak.
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const response = await httpClient.post<ApiSuccess<ForgotPasswordResult>>(
      '/auth/forgot-password',
      { email },
    )
    return response.data.data
  },

  /** Set password baru memakai token dari tautan reset. Sesi lama ikut dicabut. */
  async resetPassword(payload: { token: string; password: string }): Promise<void> {
    await httpClient.post<ApiSuccess<null>>('/auth/reset-password', payload)
  },

  /**
   * Ganti password user yang sedang login. Sesi di perangkat lain dicabut; sesi
   * saat ini dipertahankan lewat `keepRefreshToken`.
   */
  async changePassword(payload: {
    currentPassword: string
    newPassword: string
    keepRefreshToken?: string | null
  }): Promise<void> {
    await httpClient.put<ApiSuccess<null>>('/auth/password', payload)
  },

  async login(payload: LoginPayload): Promise<LoginResult> {
    const response = await httpClient.post<ApiSuccess<LoginResult>>('/auth/login', payload)
    return response.data.data
  },

  /** Second login step: exchange the MFA challenge + code for real tokens. */
  async verifyMfa(payload: {
    mfaToken: string
    code: string
    rememberMe?: boolean
  }): Promise<AuthTokens> {
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
