import { ClientError } from './ClientError';

/**
 * 403 Forbidden — authenticated but lacks required permission.
 */
export class AuthorizationError extends ClientError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
