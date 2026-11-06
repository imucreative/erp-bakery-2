/**
 * Two-factor gate for the platform console.
 *
 * The backend already enforces 2FA on every @SuperAdminOnly route; this gate
 * gives the operator a friendly redirect to the enrollment card instead of a
 * bare 403. The status is cached per page load and reset after the user
 * enables/disables 2FA.
 *
 * The status request is bounded by a timeout and fails OPEN: a slow/unreachable
 * API must never stall the router — an unresponsive navigation guard freezes
 * the whole tab.
 */

import { authService } from '@/services/auth.service'

const STATUS_TIMEOUT_MS = 3000

let cached: Promise<boolean> | null = null

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

/**
 * True when the current user has 2FA enabled.
 * Times out (and fails open) so navigation can never hang.
 */
export function isTwoFactorEnabled(): Promise<boolean> {
  cached ??= withTimeout(
    authService.getTwoFactorStatus().then((status) => status.enabled),
    STATUS_TIMEOUT_MS,
    true,
  )
  return cached
}

/** Call after enabling/disabling 2FA so the next navigation re-checks. */
export function resetTwoFactorGate(): void {
  cached = null
}
