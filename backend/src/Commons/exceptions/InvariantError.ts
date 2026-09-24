import { ClientError } from './ClientError';

/**
 * 400 Bad Request — invalid payload / business rule violation.
 */
export class InvariantError extends ClientError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'InvariantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
