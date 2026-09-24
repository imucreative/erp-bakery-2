import { ClientError } from './ClientError';

/**
 * 404 Not Found — resource does not exist.
 */
export class NotFoundError extends ClientError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
