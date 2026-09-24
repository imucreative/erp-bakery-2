import { SetMetadata } from '@nestjs/common';

/**
 * @Public()
 * Skip JwtAuthGuard for this route — no token required.
 * Used on: POST /auth/login, POST /auth/refresh, POST /companies/register
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
