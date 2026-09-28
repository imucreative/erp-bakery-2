/**
 * Minimal JWT payload decoder.
 *
 * Per ADR doc 45 §4, there is no `GET /auth/profile`; user identity and
 * permissions are decoded directly from the access token payload. This decodes
 * the payload only (no signature verification — the backend remains the source
 * of truth for authorization; the client uses the claims for UX gating).
 */

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  roleCode: string | null;
  exp?: number;
  iat?: number;
}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  // Correctly decode UTF-8 characters.
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Decodes an access token into a typed payload. Returns null when the token is
 * malformed or missing the expected claims.
 */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const raw = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
    const sub = typeof raw.sub === 'string' ? raw.sub : '';
    const email = typeof raw.email === 'string' ? raw.email : '';
    if (!sub) {
      return null;
    }

    return {
      sub,
      email,
      companyId: typeof raw.companyId === 'string' ? raw.companyId : null,
      isSuperAdmin: raw.isSuperAdmin === true,
      permissions: Array.isArray(raw.permissions)
        ? raw.permissions.filter((p): p is string => typeof p === 'string')
        : [],
      roleCode: typeof raw.roleCode === 'string' ? raw.roleCode : null,
      exp: typeof raw.exp === 'number' ? raw.exp : undefined,
      iat: typeof raw.iat === 'number' ? raw.iat : undefined,
    };
  } catch {
    return null;
  }
}

/** Returns true when the token's `exp` claim is in the past. */
export function isJwtExpired(payload: JwtPayload): boolean {
  if (typeof payload.exp !== 'number') {
    return false;
  }
  return payload.exp * 1000 <= Date.now();
}
