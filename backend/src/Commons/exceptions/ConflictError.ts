import { ClientError } from './ClientError';

/**
 * 409 Conflict — resource already exists or state conflict.
 */
export class ConflictError extends ClientError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
