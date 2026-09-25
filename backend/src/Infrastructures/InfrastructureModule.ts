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
import { ProductGroupRepository } from '../Domains/product-groups/ProductGroupRepository';
import { UomRepository } from '../Domains/uoms/UomRepository';
import { SupplierRepository } from '../Domains/suppliers/SupplierRepository';
import { CategoryRepository } from '../Domains/categories/CategoryRepository';
import { ProductRepository } from '../Domains/products/ProductRepository';
import { PasswordHash } from '../Applications/security/PasswordHash';
import { TokenManager } from '../Applications/security/TokenManager';

// Concrete implementations
import { CompanyRepositoryPostgres } from './repository/CompanyRepositoryPostgres';
import { UserRepositoryPostgres } from './repository/UserRepositoryPostgres';
import { AuthenticationRepositoryPostgres } from './repository/AuthenticationRepositoryPostgres';
import { RoleRepositoryPostgres } from './repository/RoleRepositoryPostgres';
import { PermissionRepositoryPostgres } from './repository/PermissionRepositoryPostgres';
import { OutletRepositoryPostgres } from './repository/OutletRepositoryPostgres';
import { ProductGroupRepositoryPostgres } from './repository/ProductGroupRepositoryPostgres';
import { UomRepositoryPostgres } from './repository/UomRepositoryPostgres';
import { SupplierRepositoryPostgres } from './repository/SupplierRepositoryPostgres';
import { CategoryRepositoryPostgres } from './repository/CategoryRepositoryPostgres';
import { ProductRepositoryPostgres } from './repository/ProductRepositoryPostgres';
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
import { CreateProductGroupUseCase } from '../Applications/use_case/product-groups/CreateProductGroupUseCase';
import { UpdateProductGroupUseCase } from '../Applications/use_case/product-groups/UpdateProductGroupUseCase';
import { DeleteProductGroupUseCase } from '../Applications/use_case/product-groups/DeleteProductGroupUseCase';
import { CreateUomUseCase } from '../Applications/use_case/uoms/CreateUomUseCase';
import { UpdateUomUseCase } from '../Applications/use_case/uoms/UpdateUomUseCase';
import { DeleteUomUseCase } from '../Applications/use_case/uoms/DeleteUomUseCase';
import { CreateSupplierUseCase } from '../Applications/use_case/suppliers/CreateSupplierUseCase';
import { UpdateSupplierUseCase } from '../Applications/use_case/suppliers/UpdateSupplierUseCase';
import { DeleteSupplierUseCase } from '../Applications/use_case/suppliers/DeleteSupplierUseCase';
import { CreateCategoryUseCase } from '../Applications/use_case/categories/CreateCategoryUseCase';
import { UpdateCategoryUseCase } from '../Applications/use_case/categories/UpdateCategoryUseCase';
import { DeleteCategoryUseCase } from '../Applications/use_case/categories/DeleteCategoryUseCase';
import { CreateProductUseCase } from '../Applications/use_case/products/CreateProductUseCase';
import { UpdateProductUseCase } from '../Applications/use_case/products/UpdateProductUseCase';
import { DeleteProductUseCase } from '../Applications/use_case/products/DeleteProductUseCase';

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
    {
      provide: ProductGroupRepository,
      useFactory: () => new ProductGroupRepositoryPostgres(pool),
    },
    {
      provide: UomRepository,
      useFactory: () => new UomRepositoryPostgres(pool),
    },
    {
      provide: SupplierRepository,
      useFactory: () => new SupplierRepositoryPostgres(pool),
    },
    {
      provide: CategoryRepository,
      useFactory: () => new CategoryRepositoryPostgres(pool),
    },
    {
      provide: ProductRepository,
      useFactory: () => new ProductRepositoryPostgres(pool),
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
    {
      provide: CreateProductGroupUseCase,
      useFactory: (productGroupRepo: ProductGroupRepository) =>
        new CreateProductGroupUseCase(productGroupRepo),
      inject: [ProductGroupRepository],
    },
    {
      provide: UpdateProductGroupUseCase,
      useFactory: (productGroupRepo: ProductGroupRepository) =>
        new UpdateProductGroupUseCase(productGroupRepo),
      inject: [ProductGroupRepository],
    },
    {
      provide: DeleteProductGroupUseCase,
      useFactory: (productGroupRepo: ProductGroupRepository) =>
        new DeleteProductGroupUseCase(productGroupRepo),
      inject: [ProductGroupRepository],
    },
    {
      provide: CreateUomUseCase,
      useFactory: (uomRepo: UomRepository) => new CreateUomUseCase(uomRepo),
      inject: [UomRepository],
    },
    {
      provide: UpdateUomUseCase,
      useFactory: (uomRepo: UomRepository) => new UpdateUomUseCase(uomRepo),
      inject: [UomRepository],
    },
    {
      provide: DeleteUomUseCase,
      useFactory: (uomRepo: UomRepository) => new DeleteUomUseCase(uomRepo),
      inject: [UomRepository],
    },
    {
      provide: CreateSupplierUseCase,
      useFactory: (supplierRepo: SupplierRepository) => new CreateSupplierUseCase(supplierRepo),
      inject: [SupplierRepository],
    },
    {
      provide: UpdateSupplierUseCase,
      useFactory: (supplierRepo: SupplierRepository) => new UpdateSupplierUseCase(supplierRepo),
      inject: [SupplierRepository],
    },
    {
      provide: DeleteSupplierUseCase,
      useFactory: (supplierRepo: SupplierRepository) => new DeleteSupplierUseCase(supplierRepo),
      inject: [SupplierRepository],
    },
    {
      provide: CreateCategoryUseCase,
      useFactory: (
        categoryRepo: CategoryRepository,
        productGroupRepo: ProductGroupRepository,
      ) => new CreateCategoryUseCase(categoryRepo, productGroupRepo),
      inject: [CategoryRepository, ProductGroupRepository],
    },
    {
      provide: UpdateCategoryUseCase,
      useFactory: (categoryRepo: CategoryRepository) => new UpdateCategoryUseCase(categoryRepo),
      inject: [CategoryRepository],
    },
    {
      provide: DeleteCategoryUseCase,
      useFactory: (categoryRepo: CategoryRepository) => new DeleteCategoryUseCase(categoryRepo),
      inject: [CategoryRepository],
    },
    {
      provide: CreateProductUseCase,
      useFactory: (
        productRepo: ProductRepository,
        productGroupRepo: ProductGroupRepository,
        categoryRepo: CategoryRepository,
        uomRepo: UomRepository,
        supplierRepo: SupplierRepository,
      ) =>
        new CreateProductUseCase(
          productRepo,
          productGroupRepo,
          categoryRepo,
          uomRepo,
          supplierRepo,
        ),
      inject: [
        ProductRepository,
        ProductGroupRepository,
        CategoryRepository,
        UomRepository,
        SupplierRepository,
      ],
    },
    {
      provide: UpdateProductUseCase,
      useFactory: (productRepo: ProductRepository) => new UpdateProductUseCase(productRepo),
      inject: [ProductRepository],
    },
    {
      provide: DeleteProductUseCase,
      useFactory: (productRepo: ProductRepository) => new DeleteProductUseCase(productRepo),
      inject: [ProductRepository],
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
    ProductGroupRepository,
    UomRepository,
    SupplierRepository,
    CategoryRepository,
    ProductRepository,
    RegisterCompanyUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    CreateOutletUseCase,
    UpdateOutletUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    CreateProductGroupUseCase,
    UpdateProductGroupUseCase,
    DeleteProductGroupUseCase,
    CreateUomUseCase,
    UpdateUomUseCase,
    DeleteUomUseCase,
    CreateSupplierUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
  ],
})
export class InfrastructureModule {}
