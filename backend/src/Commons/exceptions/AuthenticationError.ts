import { ClientError } from './ClientError';

/**
 * 401 Unauthorized — missing or invalid credentials / token.
 */
export class AuthenticationError extends ClientError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
