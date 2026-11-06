import { TooManyRequestsError } from '../../Commons/exceptions/TooManyRequestsError';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory rate limiter for sensitive endpoints
 * (login, 2FA code verification).
 *
 * Scope: single process. That is sufficient for this deployment; if the API is
 * ever scaled horizontally, replace this with a shared store (e.g. Redis).
 */
export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  /**
   * Register one attempt for `key`.
   * Returns whether it is allowed plus the seconds until the window resets.
   */
  consume(
    key: string,
    limit: number,
    windowMs: number,
  ): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      this.prune(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Throws TooManyRequestsError (429) when the limit is exceeded. */
  consumeOrThrow(key: string, limit: number, windowMs: number): void {
    const result = this.consume(key, limit, windowMs);
    if (!result.allowed) {
      throw new TooManyRequestsError(
        `Terlalu banyak percobaan. Coba lagi dalam ${result.retryAfterSeconds} detik.`,
      );
    }
  }

  /** Clear a key (used after a successful attempt). */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Drop expired buckets once the map grows large, to bound memory. */
  private prune(now: number): void {
    if (this.buckets.size < 10_000) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
