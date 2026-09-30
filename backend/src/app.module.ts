import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { InfrastructureModule } from './Infrastructures/InfrastructureModule';
import { AuthModule } from './Interfaces/http/api/auth/auth.module';
import { CompanyModule } from './Interfaces/http/api/companies/company.module';
import { OutletModule } from './Interfaces/http/api/outlets/outlet.module';
import { RoleModule } from './Interfaces/http/api/roles/role.module';
import { PermissionModule } from './Interfaces/http/api/permissions/permission.module';
import { UserModule } from './Interfaces/http/api/users/user.module';
import { ProductGroupModule } from './Interfaces/http/api/product-groups/product-group.module';
import { UomModule } from './Interfaces/http/api/uoms/uom.module';
import { SupplierModule } from './Interfaces/http/api/suppliers/supplier.module';
import { PaymentTermModule } from './Interfaces/http/api/payment-terms/payment-term.module';
import { CategoryModule } from './Interfaces/http/api/categories/category.module';
import { ProductModule } from './Interfaces/http/api/products/product.module';
import { InventoryModule } from './Interfaces/http/api/inventory/inventory.module';
import { StockAdjustmentModule } from './Interfaces/http/api/stock-adjustments/stock-adjustment.module';
import { StockTransferModule } from './Interfaces/http/api/stock-transfers/stock-transfer.module';
import { StockOpnameModule } from './Interfaces/http/api/stock-opnames/stock-opname.module';
import { RecipeModule } from './Interfaces/http/api/recipes/recipe.module';
import { ProductionOrderModule } from './Interfaces/http/api/production/production-order.module';
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
    OutletModule,
    RoleModule,
    PermissionModule,
    UserModule,
    ProductGroupModule,
    UomModule,
    SupplierModule,
    PaymentTermModule,
    CategoryModule,
    ProductModule,
    InventoryModule,
    StockAdjustmentModule,
    StockTransferModule,
    StockOpnameModule,
    RecipeModule,
    ProductionOrderModule,
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
