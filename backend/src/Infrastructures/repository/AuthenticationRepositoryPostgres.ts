import { Pool } from 'pg';
import { AuthenticationRepository } from '../../Domains/authentications/AuthenticationRepository';
import { AuthenticationError } from '../../Commons/exceptions/AuthenticationError';

/**
 * Concrete PostgreSQL implementation of AuthenticationRepository.
 * Manages the refresh token store in the `authentications` table.
 */
export class AuthenticationRepositoryPostgres extends AuthenticationRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async addToken(userId: string, refreshToken: string, expiredAt: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO authentications (user_id, refresh_token, expired_at)
       VALUES ($1, $2, $3)`,
      [userId, refreshToken, expiredAt],
    );
  }

  async verifyRefreshToken(refreshToken: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT id FROM authentications
       WHERE refresh_token = $1 AND expired_at > NOW()`,
      [refreshToken],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new AuthenticationError('AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND');
    }
  }

  async deleteRefreshToken(refreshToken: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM authentications WHERE refresh_token = $1`,
      [refreshToken],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new AuthenticationError('AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND');
    }
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.pool.query(`DELETE FROM authentications WHERE expired_at <= NOW()`);
  }
}
