import { ClientError } from './ClientError';

/**
 * 429 Too Many Requests — too many attempts on a sensitive endpoint
 * (e.g. login or 2FA code verification).
 */
export class TooManyRequestsError extends ClientError {
  constructor(message = 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.') {
    super(message, 429);
    this.name = 'TooManyRequestsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
