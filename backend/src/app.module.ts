import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { InfrastructureModule } from './Infrastructures/InfrastructureModule';
import { AuthModule } from './Interfaces/http/api/auth/auth.module';
import { CompanyModule } from './Interfaces/http/api/companies/company.module';
import { AllExceptionsFilter } from './Commons/exceptions/AllExceptionsFilter';
import { JwtAuthGuard } from './Interfaces/http/guards/jwt-auth.guard';
import { PermissionsGuard } from './Interfaces/http/guards/permissions.guard';

/**
 * AppModule — root NestJS module.
 *
 * Global providers:
 * - AllExceptionsFilter  → standardised error envelope for all routes
 * - JwtAuthGuard         → protects all routes by default; @Public() skips it
 * - PermissionsGuard     → enforces @RequirePermission() declarations
 *
 * InfrastructureModule is @Global() so its providers (repositories,
 * use cases, security) are available in all feature modules without
 * explicit import.
 */
@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    CompanyModule,
  ],
  providers: [
    // Global exception filter — converts domain/HTTP errors to standard JSON
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global JWT guard — every route protected unless @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global permissions guard — runs after JwtAuthGuard
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
