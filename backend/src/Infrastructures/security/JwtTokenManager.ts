import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenManager, JwtAccessPayload, JwtRefreshPayload } from '../../Applications/security/TokenManager';
import { AuthenticationError } from '../../Commons/exceptions/AuthenticationError';

/**
 * Concrete implementation of TokenManager using @nestjs/jwt.
 * Uses two separate secrets: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET.
 */
@Injectable()
export class JwtTokenManager extends TokenManager {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async createAccessToken(payload: JwtAccessPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET,
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m',
    });
  }

  async createRefreshToken(payload: JwtRefreshPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
    });
  }

  async verifyAccessToken(token: string): Promise<JwtAccessPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtAccessPayload>(token, {
        secret: process.env.ACCESS_TOKEN_SECRET,
      });
    } catch {
      throw new AuthenticationError('AUTHENTICATION.TOKEN_NOT_VALID');
    }
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });
    } catch {
      throw new AuthenticationError('AUTHENTICATION.TOKEN_NOT_VALID');
    }
  }

  async decodeRefreshToken(token: string): Promise<JwtRefreshPayload> {
    return this.jwtService.decode(token) as JwtRefreshPayload;
  }

  /**
   * Calculates expiry Date from REFRESH_TOKEN_EXPIRES_IN env var.
   * Supports formats: Xd (days), Xh (hours), Xm (minutes), Xs (seconds).
   */
  getRefreshTokenExpiry(): Date {
    const raw = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d';
    const now = new Date();
    const match = raw.match(/^(\d+)(d|h|m|s)$/);

    if (!match) {
      // fallback: 7 days
      now.setDate(now.getDate() + 7);
      return now;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 's':
        now.setSeconds(now.getSeconds() + value);
        break;
    }

    return now;
  }
}
