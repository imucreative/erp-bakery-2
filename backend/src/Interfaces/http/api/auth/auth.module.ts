import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

/**
 * AuthModule
 *
 * Use cases (LoginUseCase, RefreshTokenUseCase, LogoutUseCase) are
 * provided and exported by InfrastructureModule (@Global) — no need
 * to re-declare them here. NestJS DI resolves them automatically.
 */
@Module({
  controllers: [AuthController],
})
export class AuthModule {}
