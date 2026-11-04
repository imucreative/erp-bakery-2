import { InMemoryRateLimiter } from '../InMemoryRateLimiter';
import { TooManyRequestsError } from '../../../Commons/exceptions/TooManyRequestsError';

describe('InMemoryRateLimiter', () => {
  it('allows attempts up to the limit and blocks afterwards', () => {
    const limiter = new InMemoryRateLimiter();

    expect(limiter.consume('k', 2, 60_000).allowed).toBe(true);
    expect(limiter.consume('k', 2, 60_000).allowed).toBe(true);

    const blocked = limiter.consume('k', 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks keys independently', () => {
    const limiter = new InMemoryRateLimiter();
    limiter.consume('a', 1, 60_000);
    expect(limiter.consume('a', 1, 60_000).allowed).toBe(false);
    expect(limiter.consume('b', 1, 60_000).allowed).toBe(true);
  });

  it('resets after the window elapses', () => {
    const limiter = new InMemoryRateLimiter();
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1_000);
    expect(limiter.consume('k', 1, 1_000).allowed).toBe(true);
    expect(limiter.consume('k', 1, 1_000).allowed).toBe(false);

    nowSpy.mockReturnValue(2_100);
    expect(limiter.consume('k', 1, 1_000).allowed).toBe(true);

    nowSpy.mockRestore();
  });

  it('consumeOrThrow throws a 429 ClientError when blocked', () => {
    const limiter = new InMemoryRateLimiter();
    limiter.consumeOrThrow('k', 1, 60_000);

    expect(() => limiter.consumeOrThrow('k', 1, 60_000)).toThrow(TooManyRequestsError);
    expect(() => limiter.consumeOrThrow('k', 1, 60_000)).toThrow(/Coba lagi dalam/);
  });

  it('reset() clears a key immediately', () => {
    const limiter = new InMemoryRateLimiter();
    limiter.consume('k', 1, 60_000);
    limiter.reset('k');
    expect(limiter.consume('k', 1, 60_000).allowed).toBe(true);
  });
});
