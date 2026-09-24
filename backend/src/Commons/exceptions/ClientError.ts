/**
 * Base class for all client-facing errors (4xx).
 * Abstract — cannot be instantiated directly.
 */
export abstract class ClientError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ClientError';
    // Restore prototype chain (needed when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
