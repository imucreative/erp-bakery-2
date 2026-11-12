/**
 * Persists auth tokens + active company id so the Axios interceptor and the
 * auth store can share them across reloads.
 *
 * Two storage modes:
 *  - "Keep me logged in" → localStorage  (survives browser restarts)
 *  - default             → sessionStorage (cleared when the tab/browser closes)
 */

const ACCESS_KEY = 'erp_access_token'
const REFRESH_KEY = 'erp_refresh_token'
const COMPANY_KEY = 'erp_company_id'

/** Storage that currently holds the session; refresh token is the source of truth. */
function activeStorage(): Storage {
  if (localStorage.getItem(REFRESH_KEY)) {
    return localStorage
  }
  if (sessionStorage.getItem(REFRESH_KEY)) {
    return sessionStorage
  }
  return localStorage
}

function read(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

export function getAccessToken(): string | null {
  return read(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return read(REFRESH_KEY)
}

export function getCompanyId(): string | null {
  return read(COMPANY_KEY)
}

/**
 * Store a token pair. `rememberMe` picks the persistence mode: localStorage
 * when true, sessionStorage otherwise. Any token left in the other storage is
 * cleared so a previous session cannot leak across modes.
 */
export function setTokens(accessToken: string, refreshToken: string, rememberMe = false): void {
  clearTokens()
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(ACCESS_KEY, accessToken)
  storage.setItem(REFRESH_KEY, refreshToken)
}

export function setAccessToken(accessToken: string): void {
  activeStorage().setItem(ACCESS_KEY, accessToken)
}

export function setCompanyId(companyId: string): void {
  activeStorage().setItem(COMPANY_KEY, companyId)
}

export function clearTokens(): void {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_KEY)
    storage.removeItem(REFRESH_KEY)
    storage.removeItem(COMPANY_KEY)
  }
}
