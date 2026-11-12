/**
 * Refresh-token TTL for a login.
 *
 * When the user ticks "Keep me logged in", the session opts into a longer
 * refresh token (default 30 days). Otherwise the regular
 * REFRESH_TOKEN_EXPIRES_IN applies and the client stores the session only for
 * the lifetime of the browser session.
 */
export function refreshTokenTtlFor(rememberMe: boolean): string | undefined {
  if (!rememberMe) {
    return undefined;
  }
  return process.env.REFRESH_TOKEN_REMEMBER_EXPIRES_IN ?? '30d';
}
