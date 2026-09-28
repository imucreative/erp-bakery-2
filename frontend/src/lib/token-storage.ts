/**
 * Persistent token storage shared between the Axios client and the Pinia auth
 * store. Kept as a plain module (not a store) so the API interceptor can read
 * and update tokens without importing Pinia, avoiding a circular dependency.
 */

const ACCESS_TOKEN_KEY = 'erp-access-token';
const REFRESH_TOKEN_KEY = 'erp-refresh-token';
const COMPANY_ID_KEY = 'erp-company-id';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getCompanyId(): string | null {
  return localStorage.getItem(COMPANY_ID_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function setCompanyId(companyId: string | null): void {
  if (companyId) {
    localStorage.setItem(COMPANY_ID_KEY, companyId);
  } else {
    localStorage.removeItem(COMPANY_ID_KEY);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(COMPANY_ID_KEY);
}
