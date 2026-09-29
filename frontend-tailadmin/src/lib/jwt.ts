/**
 * Minimal JWT helpers. The backend does not expose a profile endpoint
 * (ADR doc 45 §4); the authenticated user's identity and permissions are
 * decoded from the access-token payload.
 */

export interface JwtPayload {
  sub: string
  email: string
  companyId: string | null
  isSuperAdmin: boolean
  permissions: string[]
  roleCode: string | null
  exp?: number
  iat?: number
}

/** Decodes a JWT payload (base64url, UTF-8 safe). Returns null if malformed. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    const raw = JSON.parse(json) as Partial<JwtPayload>
    return {
      sub: String(raw.sub ?? ''),
      email: String(raw.email ?? ''),
      companyId: raw.companyId ?? null,
      isSuperAdmin: Boolean(raw.isSuperAdmin),
      permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
      roleCode: raw.roleCode ?? null,
      exp: raw.exp,
      iat: raw.iat,
    }
  } catch {
    return null
  }
}

/** True when the token payload carries an `exp` that is in the past. */
export function isJwtExpired(payload: JwtPayload): boolean {
  if (!payload.exp) {
    return false
  }
  return payload.exp * 1000 <= Date.now()
}
