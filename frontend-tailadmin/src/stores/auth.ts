/**
 * Auth store (Pinia). Holds tokens (via tokenStorage), the decoded JWT identity
 * (user + permissions + company scope), and the active Company profile.
 *
 * Per ADR doc 45 §4 there is no profile endpoint; identity/permissions come
 * from decoding the access token.
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService, type Company, type LoginPayload } from '@/services/auth.service'
import { decodeJwt, isJwtExpired, type JwtPayload } from '@/lib/jwt'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setCompanyId,
  setTokens,
} from '@/lib/tokenStorage'

export interface AuthUser {
  id: string
  email: string
  companyId: string | null
  isSuperAdmin: boolean
  permissions: string[]
  roleCode: string | null
}

function toUser(payload: JwtPayload): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    companyId: payload.companyId,
    isSuperAdmin: payload.isSuperAdmin,
    permissions: payload.permissions,
    roleCode: payload.roleCode,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const company = ref<Company | null>(null)

  const isAuthenticated = computed<boolean>(() => user.value !== null)
  const permissions = computed<string[]>(() => user.value?.permissions ?? [])
  const isSuperAdmin = computed<boolean>(() => user.value?.isSuperAdmin ?? false)
  const companyName = computed<string>(() => company.value?.name ?? '')
  const userEmail = computed<string>(() => user.value?.email ?? '')

  function applyAccessToken(accessToken: string): boolean {
    const payload = decodeJwt(accessToken)
    if (!payload) {
      return false
    }
    user.value = toUser(payload)
    if (payload.companyId) {
      setCompanyId(payload.companyId)
    }
    return true
  }

  /** Rehydrates identity from a persisted, non-expired access token at startup. */
  function hydrateFromStorage(): void {
    const token = getAccessToken()
    if (!token) {
      return
    }
    const payload = decodeJwt(token)
    if (!payload || isJwtExpired(payload)) {
      clearTokens()
      return
    }
    user.value = toUser(payload)
    if (payload.companyId) {
      setCompanyId(payload.companyId)
    }
  }

  async function login(payload: LoginPayload): Promise<void> {
    const tokens = await authService.login(payload)
    setTokens(tokens.accessToken, tokens.refreshToken)
    if (!applyAccessToken(tokens.accessToken)) {
      clearTokens()
      throw new Error('Invalid session token received from server')
    }
    await loadCompany()
  }

  async function loadCompany(): Promise<void> {
    try {
      company.value = await authService.getCurrentCompany()
    } catch {
      // Company profile is non-critical for session validity; ignore failures.
      company.value = null
    }
  }

  async function logout(): Promise<void> {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } finally {
      reset()
    }
  }

  function reset(): void {
    user.value = null
    company.value = null
    clearTokens()
  }

  return {
    user,
    company,
    isAuthenticated,
    permissions,
    isSuperAdmin,
    companyName,
    userEmail,
    hydrateFromStorage,
    login,
    loadCompany,
    logout,
    reset,
  }
})
