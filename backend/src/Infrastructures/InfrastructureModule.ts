import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import pool from './database/pool';

// Domain abstracts (tokens for DI)
import { CompanyRepository } from '../Domains/companies/CompanyRepository';
import { UserRepository } from '../Domains/users/UserRepository';
import { AuthenticationRepository } from '../Domains/authentications/AuthenticationRepository';
import { RoleRepository } from '../Domains/roles/RoleRepository';
import { PermissionRepository } from '../Domains/permissions/PermissionRepository';
import { OutletRepository } from '../Domains/outlets/OutletRepository';
import { PasswordHash } from '../Applications/security/PasswordHash';
import { TokenManager } from '../Applications/security/TokenManager';

// Concrete implementations
import { CompanyRepositoryPostgres } from './repository/CompanyRepositoryPostgres';
import { UserRepositoryPostgres } from './repository/UserRepositoryPostgres';
import { AuthenticationRepositoryPostgres } from './repository/AuthenticationRepositoryPostgres';
import { RoleRepositoryPostgres } from './repository/RoleRepositoryPostgres';
import { PermissionRepositoryPostgres } from './repository/PermissionRepositoryPostgres';
import { OutletRepositoryPostgres } from './repository/OutletRepositoryPostgres';
import { BcryptPasswordHash } from './security/BcryptPasswordHash';
import { JwtTokenManager } from './security/JwtTokenManager';

// Use cases
import { RegisterCompanyUseCase } from '../Applications/use_case/companies/RegisterCompanyUseCase';
import { LoginUseCase } from '../Applications/use_case/auth/LoginUseCase';
import { RefreshTokenUseCase } from '../Applications/use_case/auth/RefreshTokenUseCase';
import { LogoutUseCase } from '../Applications/use_case/auth/LogoutUseCase';
import { CreateOutletUseCase } from '../Applications/use_case/outlets/CreateOutletUseCase';
import { UpdateOutletUseCase } from '../Applications/use_case/outlets/UpdateOutletUseCase';
import { CreateUserUseCase } from '../Applications/use_case/users/CreateUserUseCase';
import { UpdateUserUseCase } from '../Applications/use_case/users/UpdateUserUseCase';

/**
 * InfrastructureModule — NestJS DI container.
 * Mirrors sample-be's container.js: maps abstract keys → concrete implementations.
 *
 * @Global() so providers are available app-wide without re-importing.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({}), // secrets are passed per-call in JwtTokenManager
  ],
  providers: [
    // ─── Database Pool ────────────────────────────────────────────────────
    {
      provide: 'PG_POOL',
      useValue: pool,
    },

    // ─── Security ─────────────────────────────────────────────────────────
    {
      provide: PasswordHash,
      useFactory: () => new BcryptPasswordHash(10),
    },
    {
      provide: TokenManager,
      useClass: JwtTokenManager,
    },

    // ─── Repositories ─────────────────────────────────────────────────────
    {
      provide: CompanyRepository,
      useFactory: () => new CompanyRepositoryPostgres(pool),
    },
    {
      provide: UserRepository,
      useFactory: () => new UserRepositoryPostgres(pool),
    },
    {
      provide: AuthenticationRepository,
      useFactory: () => new AuthenticationRepositoryPostgres(pool),
    },
    {
      provide: RoleRepository,
      useFactory: () => new RoleRepositoryPostgres(pool),
    },
    {
      provide: PermissionRepository,
      useFactory: () => new PermissionRepositoryPostgres(pool),
    },
    {
      provide: OutletRepository,
      useFactory: () => new OutletRepositoryPostgres(pool),
    },

    // ─── Use Cases ────────────────────────────────────────────────────────
    {
      provide: RegisterCompanyUseCase,
      useFactory: (
        companyRepo: CompanyRepository,
        userRepo: UserRepository,
        roleRepo: RoleRepository,
        pwHash: PasswordHash,
      ) => new RegisterCompanyUseCase(companyRepo, userRepo, roleRepo, pwHash),
      inject: [CompanyRepository, UserRepository, RoleRepository, PasswordHash],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        userRepo: UserRepository,
        authRepo: AuthenticationRepository,
        pwHash: PasswordHash,
        tokenMgr: TokenManager,
      ) => new LoginUseCase(userRepo, authRepo, pwHash, tokenMgr),
      inject: [UserRepository, AuthenticationRepository, PasswordHash, TokenManager],
    },
    {
      provide: RefreshTokenUseCase,
      useFactory: (
        authRepo: AuthenticationRepository,
        userRepo: UserRepository,
        tokenMgr: TokenManager,
      ) => new RefreshTokenUseCase(authRepo, userRepo, tokenMgr),
      inject: [AuthenticationRepository, UserRepository, TokenManager],
    },
    {
      provide: LogoutUseCase,
      useFactory: (authRepo: AuthenticationRepository) =>
        new LogoutUseCase(authRepo),
      inject: [AuthenticationRepository],
    },
    {
      provide: CreateOutletUseCase,
      useFactory: (outletRepo: OutletRepository) =>
        new CreateOutletUseCase(outletRepo),
      inject: [OutletRepository],
    },
    {
      provide: UpdateOutletUseCase,
      useFactory: (outletRepo: OutletRepository) =>
        new UpdateOutletUseCase(outletRepo),
      inject: [OutletRepository],
    },
    {
      provide: CreateUserUseCase,
      useFactory: (
        userRepo: UserRepository,
        roleRepo: RoleRepository,
        outletRepo: OutletRepository,
        pwHash: PasswordHash,
      ) => new CreateUserUseCase(userRepo, roleRepo, outletRepo, pwHash),
      inject: [UserRepository, RoleRepository, OutletRepository, PasswordHash],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (
        userRepo: UserRepository,
        roleRepo: RoleRepository,
        outletRepo: OutletRepository,
      ) => new UpdateUserUseCase(userRepo, roleRepo, outletRepo),
      inject: [UserRepository, RoleRepository, OutletRepository],
    },
  ],
  exports: [
    'PG_POOL',
    PasswordHash,
    TokenManager,
    CompanyRepository,
    UserRepository,
    AuthenticationRepository,
    RoleRepository,
    PermissionRepository,
    OutletRepository,
    RegisterCompanyUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    CreateOutletUseCase,
    UpdateOutletUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
  ],
})
export class InfrastructureModule {}
