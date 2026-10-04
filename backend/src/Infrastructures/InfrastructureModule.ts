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
import { PaymentTermRepository } from '../Domains/payment-terms/PaymentTermRepository';
import { CategoryRepository } from '../Domains/categories/CategoryRepository';
import { ProductRepository } from '../Domains/products/ProductRepository';
import { ProductUomConversionRepository } from '../Domains/product-uom-conversions/ProductUomConversionRepository';
import { ProductToppingRepository } from '../Domains/product-toppings/ProductToppingRepository';
import { InventoryRepository } from '../Domains/inventory/InventoryRepository';
import { StockAdjustmentRepository } from '../Domains/stock-adjustments/StockAdjustmentRepository';
import { StockTransferRepository } from '../Domains/stock-transfers/StockTransferRepository';
import { StockOpnameRepository } from '../Domains/stock-opnames/StockOpnameRepository';
import { ShiftRepository } from '../Domains/shifts/ShiftRepository';
import { SalesOrderRepository } from '../Domains/sales/SalesOrderRepository';
import { RecipeRepository } from '../Domains/recipes/RecipeRepository';
import { ProductionOrderRepository } from '../Domains/production/ProductionOrderRepository';
import { PurchaseRequestRepository } from '../Domains/purchase-requests/PurchaseRequestRepository';
import { PurchaseRequestAttachmentStorage } from '../Domains/purchase-requests/PurchaseRequestAttachmentStorage';
import { PurchaseOrderAttachmentStorage } from '../Domains/purchase-orders/PurchaseOrderAttachmentStorage';
import { GoodsReceiptAttachmentStorage } from '../Domains/goods-receipts/GoodsReceiptAttachmentStorage';
import { PurchaseReturnAttachmentStorage } from '../Domains/purchase-returns/PurchaseReturnAttachmentStorage';
import { PurchaseOrderRepository } from '../Domains/purchase-orders/PurchaseOrderRepository';
import { GoodsReceiptRepository } from '../Domains/goods-receipts/GoodsReceiptRepository';
import { PurchaseReturnRepository } from '../Domains/purchase-returns/PurchaseReturnRepository';
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
import { PaymentTermRepositoryPostgres } from './repository/PaymentTermRepositoryPostgres';
import { CategoryRepositoryPostgres } from './repository/CategoryRepositoryPostgres';
import { ProductRepositoryPostgres } from './repository/ProductRepositoryPostgres';
import { ProductUomConversionRepositoryPostgres } from './repository/ProductUomConversionRepositoryPostgres';
import { ProductToppingRepositoryPostgres } from './repository/ProductToppingRepositoryPostgres';
import { InventoryRepositoryPostgres } from './repository/InventoryRepositoryPostgres';
import { StockAdjustmentRepositoryPostgres } from './repository/StockAdjustmentRepositoryPostgres';
import { StockTransferRepositoryPostgres } from './repository/StockTransferRepositoryPostgres';
import { StockOpnameRepositoryPostgres } from './repository/StockOpnameRepositoryPostgres';
import { ShiftRepositoryPostgres } from './repository/ShiftRepositoryPostgres';
import { SalesOrderRepositoryPostgres } from './repository/SalesOrderRepositoryPostgres';
import { RecipeRepositoryPostgres } from './repository/RecipeRepositoryPostgres';
import { ProductionOrderRepositoryPostgres } from './repository/ProductionOrderRepositoryPostgres';
import { PurchaseRequestRepositoryPostgres } from './repository/PurchaseRequestRepositoryPostgres';
import { PurchaseOrderRepositoryPostgres } from './repository/PurchaseOrderRepositoryPostgres';
import { GoodsReceiptRepositoryPostgres } from './repository/GoodsReceiptRepositoryPostgres';
import { PurchaseReturnRepositoryPostgres } from './repository/PurchaseReturnRepositoryPostgres';
import { LocalPurchaseRequestAttachmentStorage } from './storage/LocalPurchaseRequestAttachmentStorage';
import { LocalPurchaseOrderAttachmentStorage } from './storage/LocalPurchaseOrderAttachmentStorage';
import { LocalGoodsReceiptAttachmentStorage } from './storage/LocalGoodsReceiptAttachmentStorage';
import { LocalPurchaseReturnAttachmentStorage } from './storage/LocalPurchaseReturnAttachmentStorage';
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
import { CreatePaymentTermUseCase } from '../Applications/use_case/payment-terms/CreatePaymentTermUseCase';
import { UpdatePaymentTermUseCase } from '../Applications/use_case/payment-terms/UpdatePaymentTermUseCase';
import { DeletePaymentTermUseCase } from '../Applications/use_case/payment-terms/DeletePaymentTermUseCase';
import { CreateCategoryUseCase } from '../Applications/use_case/categories/CreateCategoryUseCase';
import { UpdateCategoryUseCase } from '../Applications/use_case/categories/UpdateCategoryUseCase';
import { DeleteCategoryUseCase } from '../Applications/use_case/categories/DeleteCategoryUseCase';
import { CreateProductUseCase } from '../Applications/use_case/products/CreateProductUseCase';
import { UpdateProductUseCase } from '../Applications/use_case/products/UpdateProductUseCase';
import { DeleteProductUseCase } from '../Applications/use_case/products/DeleteProductUseCase';
import { ListProductUomConversionsUseCase } from '../Applications/use_case/product-uom-conversions/ListProductUomConversionsUseCase';
import { CreateProductUomConversionUseCase } from '../Applications/use_case/product-uom-conversions/CreateProductUomConversionUseCase';
import { UpdateProductUomConversionUseCase } from '../Applications/use_case/product-uom-conversions/UpdateProductUomConversionUseCase';
import { DeleteProductUomConversionUseCase } from '../Applications/use_case/product-uom-conversions/DeleteProductUomConversionUseCase';
import { ListProductToppingsUseCase } from '../Applications/use_case/product-toppings/ListProductToppingsUseCase';
import { CreateProductToppingUseCase } from '../Applications/use_case/product-toppings/CreateProductToppingUseCase';
import { UpdateProductToppingUseCase } from '../Applications/use_case/product-toppings/UpdateProductToppingUseCase';
import { DeleteProductToppingUseCase } from '../Applications/use_case/product-toppings/DeleteProductToppingUseCase';
import { GetStockOnHandUseCase } from '../Applications/use_case/inventory/GetStockOnHandUseCase';
import { GetStockLedgerUseCase } from '../Applications/use_case/inventory/GetStockLedgerUseCase';
import { GetBatchesUseCase } from '../Applications/use_case/inventory/GetBatchesUseCase';
import { PlanFefoAllocationUseCase } from '../Applications/use_case/inventory/PlanFefoAllocationUseCase';
import { CreateStockAdjustmentUseCase } from '../Applications/use_case/stock-adjustments/CreateStockAdjustmentUseCase';
import { UpdateStockAdjustmentUseCase } from '../Applications/use_case/stock-adjustments/UpdateStockAdjustmentUseCase';
import { SubmitStockAdjustmentUseCase } from '../Applications/use_case/stock-adjustments/SubmitStockAdjustmentUseCase';
import { ApproveStockAdjustmentUseCase } from '../Applications/use_case/stock-adjustments/ApproveStockAdjustmentUseCase';
import { CancelStockAdjustmentUseCase } from '../Applications/use_case/stock-adjustments/CancelStockAdjustmentUseCase';
import { CompleteStockAdjustmentUseCase } from '../Applications/use_case/stock-adjustments/CompleteStockAdjustmentUseCase';
import { GetStockAdjustmentsUseCase } from '../Applications/use_case/stock-adjustments/GetStockAdjustmentsUseCase';
import { CreateStockTransferUseCase } from '../Applications/use_case/stock-transfers/CreateStockTransferUseCase';
import { UpdateStockTransferUseCase } from '../Applications/use_case/stock-transfers/UpdateStockTransferUseCase';
import { SubmitStockTransferUseCase } from '../Applications/use_case/stock-transfers/SubmitStockTransferUseCase';
import { DispatchStockTransferUseCase } from '../Applications/use_case/stock-transfers/DispatchStockTransferUseCase';
import { ReceiveStockTransferUseCase } from '../Applications/use_case/stock-transfers/ReceiveStockTransferUseCase';
import { CancelStockTransferUseCase } from '../Applications/use_case/stock-transfers/CancelStockTransferUseCase';
import { GetStockTransfersUseCase } from '../Applications/use_case/stock-transfers/GetStockTransfersUseCase';
import { CreateStockOpnameUseCase } from '../Applications/use_case/stock-opnames/CreateStockOpnameUseCase';
import { StartStockOpnameUseCase } from '../Applications/use_case/stock-opnames/StartStockOpnameUseCase';
import { RecordCountUseCase } from '../Applications/use_case/stock-opnames/RecordCountUseCase';
import { SubmitStockOpnameUseCase } from '../Applications/use_case/stock-opnames/SubmitStockOpnameUseCase';
import { ApproveStockOpnameUseCase } from '../Applications/use_case/stock-opnames/ApproveStockOpnameUseCase';
import { CompleteStockOpnameUseCase } from '../Applications/use_case/stock-opnames/CompleteStockOpnameUseCase';
import { CancelStockOpnameUseCase } from '../Applications/use_case/stock-opnames/CancelStockOpnameUseCase';
import { GetStockOpnamesUseCase } from '../Applications/use_case/stock-opnames/GetStockOpnamesUseCase';
import { OpenShiftUseCase } from '../Applications/use_case/shifts/OpenShiftUseCase';
import { CloseShiftUseCase } from '../Applications/use_case/shifts/CloseShiftUseCase';
import { GetShiftsUseCase } from '../Applications/use_case/shifts/GetShiftsUseCase';
import { CreateSalesOrderUseCase } from '../Applications/use_case/sales/CreateSalesOrderUseCase';
import { PaySalesOrderUseCase } from '../Applications/use_case/sales/PaySalesOrderUseCase';
import { VoidSalesOrderUseCase } from '../Applications/use_case/sales/VoidSalesOrderUseCase';
import { RefundSalesOrderUseCase } from '../Applications/use_case/sales/RefundSalesOrderUseCase';
import { GetSalesOrdersUseCase } from '../Applications/use_case/sales/GetSalesOrdersUseCase';
import { GetInventoryDashboardUseCase } from '../Applications/use_case/inventory/GetInventoryDashboardUseCase';
import { CreateRecipeUseCase } from '../Applications/use_case/recipes/CreateRecipeUseCase';
import { UpdateRecipeUseCase } from '../Applications/use_case/recipes/UpdateRecipeUseCase';
import { ActivateRecipeUseCase } from '../Applications/use_case/recipes/ActivateRecipeUseCase';
import { ArchiveRecipeUseCase } from '../Applications/use_case/recipes/ArchiveRecipeUseCase';
import { DeleteRecipeUseCase } from '../Applications/use_case/recipes/DeleteRecipeUseCase';
import { GetRecipesUseCase } from '../Applications/use_case/recipes/GetRecipesUseCase';
import { CreateRoleUseCase } from '../Applications/use_case/roles/CreateRoleUseCase';
import { UpdateRoleUseCase } from '../Applications/use_case/roles/UpdateRoleUseCase';
import { DeleteRoleUseCase } from '../Applications/use_case/roles/DeleteRoleUseCase';
import { CreateProductionOrderUseCase } from '../Applications/use_case/production/CreateProductionOrderUseCase';
import { GetProductionOrdersUseCase } from '../Applications/use_case/production/GetProductionOrdersUseCase';
import { CreatePurchaseRequestUseCase } from '../Applications/use_case/purchase-requests/CreatePurchaseRequestUseCase';
import { UpdatePurchaseRequestUseCase } from '../Applications/use_case/purchase-requests/UpdatePurchaseRequestUseCase';
import { SubmitPurchaseRequestUseCase } from '../Applications/use_case/purchase-requests/SubmitPurchaseRequestUseCase';
import { ApprovePurchaseRequestUseCase } from '../Applications/use_case/purchase-requests/ApprovePurchaseRequestUseCase';
import { RejectPurchaseRequestUseCase } from '../Applications/use_case/purchase-requests/RejectPurchaseRequestUseCase';
import { CancelPurchaseRequestUseCase } from '../Applications/use_case/purchase-requests/CancelPurchaseRequestUseCase';
import { GetPurchaseRequestsUseCase } from '../Applications/use_case/purchase-requests/GetPurchaseRequestsUseCase';
import { AddPurchaseRequestCommentUseCase } from '../Applications/use_case/purchase-requests/AddPurchaseRequestCommentUseCase';
import { GetPurchaseRequestCommentsUseCase } from '../Applications/use_case/purchase-requests/GetPurchaseRequestCommentsUseCase';
import { UploadPurchaseRequestAttachmentUseCase } from '../Applications/use_case/purchase-requests/UploadPurchaseRequestAttachmentUseCase';
import { ListPurchaseRequestAttachmentsUseCase } from '../Applications/use_case/purchase-requests/ListPurchaseRequestAttachmentsUseCase';
import { GetPurchaseRequestAttachmentUseCase } from '../Applications/use_case/purchase-requests/GetPurchaseRequestAttachmentUseCase';
import { DeletePurchaseRequestAttachmentUseCase } from '../Applications/use_case/purchase-requests/DeletePurchaseRequestAttachmentUseCase';
import { CreatePurchaseOrderUseCase } from '../Applications/use_case/purchase-orders/CreatePurchaseOrderUseCase';
import { UpdatePurchaseOrderUseCase } from '../Applications/use_case/purchase-orders/UpdatePurchaseOrderUseCase';
import { SubmitPurchaseOrderUseCase } from '../Applications/use_case/purchase-orders/SubmitPurchaseOrderUseCase';
import { ApprovePurchaseOrderUseCase } from '../Applications/use_case/purchase-orders/ApprovePurchaseOrderUseCase';
import { RejectPurchaseOrderUseCase } from '../Applications/use_case/purchase-orders/RejectPurchaseOrderUseCase';
import { CancelPurchaseOrderUseCase } from '../Applications/use_case/purchase-orders/CancelPurchaseOrderUseCase';
import { GetPurchaseOrdersUseCase } from '../Applications/use_case/purchase-orders/GetPurchaseOrdersUseCase';
import { GetPurchaseOrderOutstandingUseCase } from '../Applications/use_case/purchase-orders/GetPurchaseOrderOutstandingUseCase';
import { AddPurchaseOrderCommentUseCase } from '../Applications/use_case/purchase-orders/AddPurchaseOrderCommentUseCase';
import { GetPurchaseOrderCommentsUseCase } from '../Applications/use_case/purchase-orders/GetPurchaseOrderCommentsUseCase';
import { UploadPurchaseOrderAttachmentUseCase } from '../Applications/use_case/purchase-orders/UploadPurchaseOrderAttachmentUseCase';
import { ListPurchaseOrderAttachmentsUseCase } from '../Applications/use_case/purchase-orders/ListPurchaseOrderAttachmentsUseCase';
import { GetPurchaseOrderAttachmentUseCase } from '../Applications/use_case/purchase-orders/GetPurchaseOrderAttachmentUseCase';
import { DeletePurchaseOrderAttachmentUseCase } from '../Applications/use_case/purchase-orders/DeletePurchaseOrderAttachmentUseCase';
import { CreateGoodsReceiptUseCase } from '../Applications/use_case/goods-receipts/CreateGoodsReceiptUseCase';
import { UpdateGoodsReceiptUseCase } from '../Applications/use_case/goods-receipts/UpdateGoodsReceiptUseCase';
import { CancelGoodsReceiptUseCase } from '../Applications/use_case/goods-receipts/CancelGoodsReceiptUseCase';
import { CompleteGoodsReceiptUseCase } from '../Applications/use_case/goods-receipts/CompleteGoodsReceiptUseCase';
import { GetGoodsReceiptsUseCase } from '../Applications/use_case/goods-receipts/GetGoodsReceiptsUseCase';
import { GetGoodsReceiptOutstandingUseCase } from '../Applications/use_case/goods-receipts/GetGoodsReceiptOutstandingUseCase';
import { AddGoodsReceiptCommentUseCase } from '../Applications/use_case/goods-receipts/AddGoodsReceiptCommentUseCase';
import { GetGoodsReceiptCommentsUseCase } from '../Applications/use_case/goods-receipts/GetGoodsReceiptCommentsUseCase';
import { UploadGoodsReceiptAttachmentUseCase } from '../Applications/use_case/goods-receipts/UploadGoodsReceiptAttachmentUseCase';
import { ListGoodsReceiptAttachmentsUseCase } from '../Applications/use_case/goods-receipts/ListGoodsReceiptAttachmentsUseCase';
import { GetGoodsReceiptAttachmentUseCase } from '../Applications/use_case/goods-receipts/GetGoodsReceiptAttachmentUseCase';
import { DeleteGoodsReceiptAttachmentUseCase } from '../Applications/use_case/goods-receipts/DeleteGoodsReceiptAttachmentUseCase';
import { CreatePurchaseReturnUseCase } from '../Applications/use_case/purchase-returns/CreatePurchaseReturnUseCase';
import { UpdatePurchaseReturnUseCase } from '../Applications/use_case/purchase-returns/UpdatePurchaseReturnUseCase';
import { SubmitPurchaseReturnUseCase } from '../Applications/use_case/purchase-returns/SubmitPurchaseReturnUseCase';
import { CompletePurchaseReturnUseCase } from '../Applications/use_case/purchase-returns/CompletePurchaseReturnUseCase';
import { CancelPurchaseReturnUseCase } from '../Applications/use_case/purchase-returns/CancelPurchaseReturnUseCase';
import { GetPurchaseReturnsUseCase } from '../Applications/use_case/purchase-returns/GetPurchaseReturnsUseCase';
import { GetReturnableUseCase } from '../Applications/use_case/purchase-returns/GetReturnableUseCase';
import { AddPurchaseReturnCommentUseCase } from '../Applications/use_case/purchase-returns/AddPurchaseReturnCommentUseCase';
import { GetPurchaseReturnCommentsUseCase } from '../Applications/use_case/purchase-returns/GetPurchaseReturnCommentsUseCase';
import { UploadPurchaseReturnAttachmentUseCase } from '../Applications/use_case/purchase-returns/UploadPurchaseReturnAttachmentUseCase';
import { ListPurchaseReturnAttachmentsUseCase } from '../Applications/use_case/purchase-returns/ListPurchaseReturnAttachmentsUseCase';
import { GetPurchaseReturnAttachmentUseCase } from '../Applications/use_case/purchase-returns/GetPurchaseReturnAttachmentUseCase';
import { DeletePurchaseReturnAttachmentUseCase } from '../Applications/use_case/purchase-returns/DeletePurchaseReturnAttachmentUseCase';

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
      provide: PaymentTermRepository,
      useFactory: () => new PaymentTermRepositoryPostgres(pool),
    },
    {
      provide: CategoryRepository,
      useFactory: () => new CategoryRepositoryPostgres(pool),
    },
    {
      provide: ProductRepository,
      useFactory: () => new ProductRepositoryPostgres(pool),
    },
    {
      provide: ProductUomConversionRepository,
      useFactory: () => new ProductUomConversionRepositoryPostgres(pool),
    },
    {
      provide: ProductToppingRepository,
      useFactory: () => new ProductToppingRepositoryPostgres(pool),
    },
    {
      provide: InventoryRepository,
      useFactory: () => new InventoryRepositoryPostgres(pool),
    },
    {
      provide: StockAdjustmentRepository,
      useFactory: () => new StockAdjustmentRepositoryPostgres(pool),
    },
    {
      provide: StockTransferRepository,
      useFactory: () => new StockTransferRepositoryPostgres(pool),
    },
    {
      provide: StockOpnameRepository,
      useFactory: () => new StockOpnameRepositoryPostgres(pool),
    },
    {
      provide: ShiftRepository,
      useFactory: () => new ShiftRepositoryPostgres(pool),
    },
    {
      provide: SalesOrderRepository,
      useFactory: () => new SalesOrderRepositoryPostgres(pool),
    },
    {
      provide: RecipeRepository,
      useFactory: () => new RecipeRepositoryPostgres(pool),
    },
    {
      provide: ProductionOrderRepository,
      useFactory: () => new ProductionOrderRepositoryPostgres(pool),
    },
    {
      provide: PurchaseRequestRepository,
      useFactory: () => new PurchaseRequestRepositoryPostgres(pool),
    },
    {
      provide: PurchaseOrderRepository,
      useFactory: () => new PurchaseOrderRepositoryPostgres(pool),
    },
    {
      provide: GoodsReceiptRepository,
      useFactory: () => new GoodsReceiptRepositoryPostgres(pool),
    },
    {
      provide: PurchaseReturnRepository,
      useFactory: () => new PurchaseReturnRepositoryPostgres(pool),
    },

    // ─── Storage ──────────────────────────────────────────────────────────
    {
      provide: PurchaseRequestAttachmentStorage,
      useFactory: () => new LocalPurchaseRequestAttachmentStorage(),
    },
    {
      provide: PurchaseOrderAttachmentStorage,
      useFactory: () => new LocalPurchaseOrderAttachmentStorage(),
    },
    {
      provide: GoodsReceiptAttachmentStorage,
      useFactory: () => new LocalGoodsReceiptAttachmentStorage(),
    },
    {
      provide: PurchaseReturnAttachmentStorage,
      useFactory: () => new LocalPurchaseReturnAttachmentStorage(),
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
      provide: CreateRoleUseCase,
      useFactory: (roleRepo: RoleRepository, permissionRepo: PermissionRepository) =>
        new CreateRoleUseCase(roleRepo, permissionRepo),
      inject: [RoleRepository, PermissionRepository],
    },
    {
      provide: UpdateRoleUseCase,
      useFactory: (roleRepo: RoleRepository, permissionRepo: PermissionRepository) =>
        new UpdateRoleUseCase(roleRepo, permissionRepo),
      inject: [RoleRepository, PermissionRepository],
    },
    {
      provide: DeleteRoleUseCase,
      useFactory: (roleRepo: RoleRepository) => new DeleteRoleUseCase(roleRepo),
      inject: [RoleRepository],
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
      useFactory: (supplierRepo: SupplierRepository, paymentTermRepo: PaymentTermRepository) =>
        new CreateSupplierUseCase(supplierRepo, paymentTermRepo),
      inject: [SupplierRepository, PaymentTermRepository],
    },
    {
      provide: UpdateSupplierUseCase,
      useFactory: (supplierRepo: SupplierRepository, paymentTermRepo: PaymentTermRepository) =>
        new UpdateSupplierUseCase(supplierRepo, paymentTermRepo),
      inject: [SupplierRepository, PaymentTermRepository],
    },
    {
      provide: DeleteSupplierUseCase,
      useFactory: (supplierRepo: SupplierRepository) => new DeleteSupplierUseCase(supplierRepo),
      inject: [SupplierRepository],
    },
    {
      provide: CreatePaymentTermUseCase,
      useFactory: (paymentTermRepo: PaymentTermRepository) =>
        new CreatePaymentTermUseCase(paymentTermRepo),
      inject: [PaymentTermRepository],
    },
    {
      provide: UpdatePaymentTermUseCase,
      useFactory: (paymentTermRepo: PaymentTermRepository) =>
        new UpdatePaymentTermUseCase(paymentTermRepo),
      inject: [PaymentTermRepository],
    },
    {
      provide: DeletePaymentTermUseCase,
      useFactory: (paymentTermRepo: PaymentTermRepository) =>
        new DeletePaymentTermUseCase(paymentTermRepo),
      inject: [PaymentTermRepository],
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
    {
      provide: ListProductUomConversionsUseCase,
      useFactory: (
        conversionRepo: ProductUomConversionRepository,
        productRepo: ProductRepository,
      ) => new ListProductUomConversionsUseCase(conversionRepo, productRepo),
      inject: [ProductUomConversionRepository, ProductRepository],
    },
    {
      provide: CreateProductUomConversionUseCase,
      useFactory: (
        conversionRepo: ProductUomConversionRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
      ) => new CreateProductUomConversionUseCase(conversionRepo, productRepo, uomRepo),
      inject: [ProductUomConversionRepository, ProductRepository, UomRepository],
    },
    {
      provide: UpdateProductUomConversionUseCase,
      useFactory: (
        conversionRepo: ProductUomConversionRepository,
        productRepo: ProductRepository,
      ) => new UpdateProductUomConversionUseCase(conversionRepo, productRepo),
      inject: [ProductUomConversionRepository, ProductRepository],
    },
    {
      provide: DeleteProductUomConversionUseCase,
      useFactory: (
        conversionRepo: ProductUomConversionRepository,
        productRepo: ProductRepository,
      ) => new DeleteProductUomConversionUseCase(conversionRepo, productRepo),
      inject: [ProductUomConversionRepository, ProductRepository],
    },
    {
      provide: ListProductToppingsUseCase,
      useFactory: (
        toppingRepo: ProductToppingRepository,
        productRepo: ProductRepository,
      ) => new ListProductToppingsUseCase(toppingRepo, productRepo),
      inject: [ProductToppingRepository, ProductRepository],
    },
    {
      provide: CreateProductToppingUseCase,
      useFactory: (
        toppingRepo: ProductToppingRepository,
        productRepo: ProductRepository,
      ) => new CreateProductToppingUseCase(toppingRepo, productRepo),
      inject: [ProductToppingRepository, ProductRepository],
    },
    {
      provide: UpdateProductToppingUseCase,
      useFactory: (
        toppingRepo: ProductToppingRepository,
        productRepo: ProductRepository,
      ) => new UpdateProductToppingUseCase(toppingRepo, productRepo),
      inject: [ProductToppingRepository, ProductRepository],
    },
    {
      provide: DeleteProductToppingUseCase,
      useFactory: (
        toppingRepo: ProductToppingRepository,
        productRepo: ProductRepository,
      ) => new DeleteProductToppingUseCase(toppingRepo, productRepo),
      inject: [ProductToppingRepository, ProductRepository],
    },
    {
      provide: GetStockOnHandUseCase,
      useFactory: (inventoryRepo: InventoryRepository) =>
        new GetStockOnHandUseCase(inventoryRepo),
      inject: [InventoryRepository],
    },
    {
      provide: GetStockLedgerUseCase,
      useFactory: (inventoryRepo: InventoryRepository) =>
        new GetStockLedgerUseCase(inventoryRepo),
      inject: [InventoryRepository],
    },
    {
      provide: GetBatchesUseCase,
      useFactory: (inventoryRepo: InventoryRepository) => new GetBatchesUseCase(inventoryRepo),
      inject: [InventoryRepository],
    },
    {
      provide: PlanFefoAllocationUseCase,
      useFactory: (inventoryRepo: InventoryRepository) =>
        new PlanFefoAllocationUseCase(inventoryRepo),
      inject: [InventoryRepository],
    },
    {
      provide: CreateStockAdjustmentUseCase,
      useFactory: (adjRepo: StockAdjustmentRepository, invRepo: InventoryRepository) =>
        new CreateStockAdjustmentUseCase(adjRepo, invRepo),
      inject: [StockAdjustmentRepository, InventoryRepository],
    },
    {
      provide: UpdateStockAdjustmentUseCase,
      useFactory: (adjRepo: StockAdjustmentRepository, invRepo: InventoryRepository) =>
        new UpdateStockAdjustmentUseCase(adjRepo, invRepo),
      inject: [StockAdjustmentRepository, InventoryRepository],
    },
    {
      provide: SubmitStockAdjustmentUseCase,
      useFactory: (adjRepo: StockAdjustmentRepository) =>
        new SubmitStockAdjustmentUseCase(adjRepo),
      inject: [StockAdjustmentRepository],
    },
    {
      provide: ApproveStockAdjustmentUseCase,
      useFactory: (adjRepo: StockAdjustmentRepository) =>
        new ApproveStockAdjustmentUseCase(adjRepo),
      inject: [StockAdjustmentRepository],
    },
    {
      provide: CancelStockAdjustmentUseCase,
      useFactory: (adjRepo: StockAdjustmentRepository) =>
        new CancelStockAdjustmentUseCase(adjRepo),
      inject: [StockAdjustmentRepository],
    },
    {
      provide: CompleteStockAdjustmentUseCase,
      useFactory: (adjRepo: StockAdjustmentRepository) =>
        new CompleteStockAdjustmentUseCase(adjRepo),
      inject: [StockAdjustmentRepository],
    },
    {
      provide: GetStockAdjustmentsUseCase,
      useFactory: (adjRepo: StockAdjustmentRepository) =>
        new GetStockAdjustmentsUseCase(adjRepo),
      inject: [StockAdjustmentRepository],
    },
    {
      provide: CreateStockTransferUseCase,
      useFactory: (trfRepo: StockTransferRepository, invRepo: InventoryRepository) =>
        new CreateStockTransferUseCase(trfRepo, invRepo),
      inject: [StockTransferRepository, InventoryRepository],
    },
    {
      provide: UpdateStockTransferUseCase,
      useFactory: (trfRepo: StockTransferRepository, invRepo: InventoryRepository) =>
        new UpdateStockTransferUseCase(trfRepo, invRepo),
      inject: [StockTransferRepository, InventoryRepository],
    },
    {
      provide: SubmitStockTransferUseCase,
      useFactory: (trfRepo: StockTransferRepository) => new SubmitStockTransferUseCase(trfRepo),
      inject: [StockTransferRepository],
    },
    {
      provide: DispatchStockTransferUseCase,
      useFactory: (trfRepo: StockTransferRepository) => new DispatchStockTransferUseCase(trfRepo),
      inject: [StockTransferRepository],
    },
    {
      provide: ReceiveStockTransferUseCase,
      useFactory: (trfRepo: StockTransferRepository) => new ReceiveStockTransferUseCase(trfRepo),
      inject: [StockTransferRepository],
    },
    {
      provide: CancelStockTransferUseCase,
      useFactory: (trfRepo: StockTransferRepository) => new CancelStockTransferUseCase(trfRepo),
      inject: [StockTransferRepository],
    },
    {
      provide: GetStockTransfersUseCase,
      useFactory: (trfRepo: StockTransferRepository) => new GetStockTransfersUseCase(trfRepo),
      inject: [StockTransferRepository],
    },
    {
      provide: CreateStockOpnameUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new CreateStockOpnameUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: StartStockOpnameUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new StartStockOpnameUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: RecordCountUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new RecordCountUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: SubmitStockOpnameUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new SubmitStockOpnameUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: ApproveStockOpnameUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new ApproveStockOpnameUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: CompleteStockOpnameUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new CompleteStockOpnameUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: CancelStockOpnameUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new CancelStockOpnameUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: GetStockOpnamesUseCase,
      useFactory: (opnRepo: StockOpnameRepository) => new GetStockOpnamesUseCase(opnRepo),
      inject: [StockOpnameRepository],
    },
    {
      provide: OpenShiftUseCase,
      useFactory: (shiftRepo: ShiftRepository, outletRepo: OutletRepository) =>
        new OpenShiftUseCase(shiftRepo, outletRepo),
      inject: [ShiftRepository, OutletRepository],
    },
    {
      provide: CloseShiftUseCase,
      useFactory: (shiftRepo: ShiftRepository) => new CloseShiftUseCase(shiftRepo),
      inject: [ShiftRepository],
    },
    {
      provide: GetShiftsUseCase,
      useFactory: (shiftRepo: ShiftRepository) => new GetShiftsUseCase(shiftRepo),
      inject: [ShiftRepository],
    },
    {
      provide: CreateSalesOrderUseCase,
      useFactory: (
        salesRepo: SalesOrderRepository,
        shiftRepo: ShiftRepository,
        outletRepo: OutletRepository,
      ) => new CreateSalesOrderUseCase(salesRepo, shiftRepo, outletRepo),
      inject: [SalesOrderRepository, ShiftRepository, OutletRepository],
    },
    {
      provide: PaySalesOrderUseCase,
      useFactory: (salesRepo: SalesOrderRepository) => new PaySalesOrderUseCase(salesRepo),
      inject: [SalesOrderRepository],
    },
    {
      provide: VoidSalesOrderUseCase,
      useFactory: (salesRepo: SalesOrderRepository) => new VoidSalesOrderUseCase(salesRepo),
      inject: [SalesOrderRepository],
    },
    {
      provide: RefundSalesOrderUseCase,
      useFactory: (salesRepo: SalesOrderRepository) => new RefundSalesOrderUseCase(salesRepo),
      inject: [SalesOrderRepository],
    },
    {
      provide: GetSalesOrdersUseCase,
      useFactory: (salesRepo: SalesOrderRepository) => new GetSalesOrdersUseCase(salesRepo),
      inject: [SalesOrderRepository],
    },
    {
      provide: GetInventoryDashboardUseCase,
      useFactory: (invRepo: InventoryRepository) => new GetInventoryDashboardUseCase(invRepo),
      inject: [InventoryRepository],
    },
    {
      provide: CreateRecipeUseCase,
      useFactory: (
        recipeRepo: RecipeRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
      ) => new CreateRecipeUseCase(recipeRepo, productRepo, uomRepo),
      inject: [RecipeRepository, ProductRepository, UomRepository],
    },
    {
      provide: UpdateRecipeUseCase,
      useFactory: (
        recipeRepo: RecipeRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
      ) => new UpdateRecipeUseCase(recipeRepo, productRepo, uomRepo),
      inject: [RecipeRepository, ProductRepository, UomRepository],
    },
    {
      provide: ActivateRecipeUseCase,
      useFactory: (recipeRepo: RecipeRepository) => new ActivateRecipeUseCase(recipeRepo),
      inject: [RecipeRepository],
    },
    {
      provide: ArchiveRecipeUseCase,
      useFactory: (recipeRepo: RecipeRepository) => new ArchiveRecipeUseCase(recipeRepo),
      inject: [RecipeRepository],
    },
    {
      provide: DeleteRecipeUseCase,
      useFactory: (recipeRepo: RecipeRepository) => new DeleteRecipeUseCase(recipeRepo),
      inject: [RecipeRepository],
    },
    {
      provide: GetRecipesUseCase,
      useFactory: (recipeRepo: RecipeRepository) => new GetRecipesUseCase(recipeRepo),
      inject: [RecipeRepository],
    },
    {
      provide: CreateProductionOrderUseCase,
      useFactory: (prodRepo: ProductionOrderRepository, outletRepo: OutletRepository) =>
        new CreateProductionOrderUseCase(prodRepo, outletRepo),
      inject: [ProductionOrderRepository, OutletRepository],
    },
    {
      provide: GetProductionOrdersUseCase,
      useFactory: (prodRepo: ProductionOrderRepository, outletRepo: OutletRepository) =>
        new GetProductionOrdersUseCase(prodRepo, outletRepo),
      inject: [ProductionOrderRepository, OutletRepository],
    },
    {
      provide: CreatePurchaseRequestUseCase,
      useFactory: (
        prRepo: PurchaseRequestRepository,
        outletRepo: OutletRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
      ) => new CreatePurchaseRequestUseCase(prRepo, outletRepo, productRepo, uomRepo),
      inject: [PurchaseRequestRepository, OutletRepository, ProductRepository, UomRepository],
    },
    {
      provide: UpdatePurchaseRequestUseCase,
      useFactory: (
        prRepo: PurchaseRequestRepository,
        outletRepo: OutletRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
      ) => new UpdatePurchaseRequestUseCase(prRepo, outletRepo, productRepo, uomRepo),
      inject: [PurchaseRequestRepository, OutletRepository, ProductRepository, UomRepository],
    },
    {
      provide: SubmitPurchaseRequestUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) => new SubmitPurchaseRequestUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: ApprovePurchaseRequestUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) => new ApprovePurchaseRequestUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: RejectPurchaseRequestUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) => new RejectPurchaseRequestUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: CancelPurchaseRequestUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) => new CancelPurchaseRequestUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: GetPurchaseRequestsUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) => new GetPurchaseRequestsUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: AddPurchaseRequestCommentUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) =>
        new AddPurchaseRequestCommentUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: GetPurchaseRequestCommentsUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) =>
        new GetPurchaseRequestCommentsUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: UploadPurchaseRequestAttachmentUseCase,
      useFactory: (
        prRepo: PurchaseRequestRepository,
        storage: PurchaseRequestAttachmentStorage,
      ) => new UploadPurchaseRequestAttachmentUseCase(prRepo, storage),
      inject: [PurchaseRequestRepository, PurchaseRequestAttachmentStorage],
    },
    {
      provide: ListPurchaseRequestAttachmentsUseCase,
      useFactory: (prRepo: PurchaseRequestRepository) =>
        new ListPurchaseRequestAttachmentsUseCase(prRepo),
      inject: [PurchaseRequestRepository],
    },
    {
      provide: GetPurchaseRequestAttachmentUseCase,
      useFactory: (
        prRepo: PurchaseRequestRepository,
        storage: PurchaseRequestAttachmentStorage,
      ) => new GetPurchaseRequestAttachmentUseCase(prRepo, storage),
      inject: [PurchaseRequestRepository, PurchaseRequestAttachmentStorage],
    },
    {
      provide: DeletePurchaseRequestAttachmentUseCase,
      useFactory: (
        prRepo: PurchaseRequestRepository,
        storage: PurchaseRequestAttachmentStorage,
      ) => new DeletePurchaseRequestAttachmentUseCase(prRepo, storage),
      inject: [PurchaseRequestRepository, PurchaseRequestAttachmentStorage],
    },
    {
      provide: CreatePurchaseOrderUseCase,
      useFactory: (
        poRepo: PurchaseOrderRepository,
        prRepo: PurchaseRequestRepository,
        supplierRepo: SupplierRepository,
        paymentTermRepo: PaymentTermRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
      ) =>
        new CreatePurchaseOrderUseCase(
          poRepo,
          prRepo,
          supplierRepo,
          paymentTermRepo,
          productRepo,
          uomRepo,
        ),
      inject: [
        PurchaseOrderRepository,
        PurchaseRequestRepository,
        SupplierRepository,
        PaymentTermRepository,
        ProductRepository,
        UomRepository,
      ],
    },
    {
      provide: UpdatePurchaseOrderUseCase,
      useFactory: (
        poRepo: PurchaseOrderRepository,
        prRepo: PurchaseRequestRepository,
        supplierRepo: SupplierRepository,
        paymentTermRepo: PaymentTermRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
      ) =>
        new UpdatePurchaseOrderUseCase(
          poRepo,
          prRepo,
          supplierRepo,
          paymentTermRepo,
          productRepo,
          uomRepo,
        ),
      inject: [
        PurchaseOrderRepository,
        PurchaseRequestRepository,
        SupplierRepository,
        PaymentTermRepository,
        ProductRepository,
        UomRepository,
      ],
    },
    {
      provide: SubmitPurchaseOrderUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) => new SubmitPurchaseOrderUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: ApprovePurchaseOrderUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) => new ApprovePurchaseOrderUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: RejectPurchaseOrderUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) => new RejectPurchaseOrderUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: CancelPurchaseOrderUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) => new CancelPurchaseOrderUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: GetPurchaseOrdersUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) => new GetPurchaseOrdersUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: GetPurchaseOrderOutstandingUseCase,
      useFactory: (
        poRepo: PurchaseOrderRepository,
        prRepo: PurchaseRequestRepository,
      ) => new GetPurchaseOrderOutstandingUseCase(poRepo, prRepo),
      inject: [PurchaseOrderRepository, PurchaseRequestRepository],
    },
    {
      provide: AddPurchaseOrderCommentUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) =>
        new AddPurchaseOrderCommentUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: GetPurchaseOrderCommentsUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) =>
        new GetPurchaseOrderCommentsUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: UploadPurchaseOrderAttachmentUseCase,
      useFactory: (
        poRepo: PurchaseOrderRepository,
        storage: PurchaseOrderAttachmentStorage,
      ) => new UploadPurchaseOrderAttachmentUseCase(poRepo, storage),
      inject: [PurchaseOrderRepository, PurchaseOrderAttachmentStorage],
    },
    {
      provide: ListPurchaseOrderAttachmentsUseCase,
      useFactory: (poRepo: PurchaseOrderRepository) =>
        new ListPurchaseOrderAttachmentsUseCase(poRepo),
      inject: [PurchaseOrderRepository],
    },
    {
      provide: GetPurchaseOrderAttachmentUseCase,
      useFactory: (
        poRepo: PurchaseOrderRepository,
        storage: PurchaseOrderAttachmentStorage,
      ) => new GetPurchaseOrderAttachmentUseCase(poRepo, storage),
      inject: [PurchaseOrderRepository, PurchaseOrderAttachmentStorage],
    },
    {
      provide: DeletePurchaseOrderAttachmentUseCase,
      useFactory: (
        poRepo: PurchaseOrderRepository,
        storage: PurchaseOrderAttachmentStorage,
      ) => new DeletePurchaseOrderAttachmentUseCase(poRepo, storage),
      inject: [PurchaseOrderRepository, PurchaseOrderAttachmentStorage],
    },
    {
      provide: CreateGoodsReceiptUseCase,
      useFactory: (
        grRepo: GoodsReceiptRepository,
        poRepo: PurchaseOrderRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
        conversionRepo: ProductUomConversionRepository,
      ) => new CreateGoodsReceiptUseCase(grRepo, poRepo, productRepo, uomRepo, conversionRepo),
      inject: [
        GoodsReceiptRepository,
        PurchaseOrderRepository,
        ProductRepository,
        UomRepository,
        ProductUomConversionRepository,
      ],
    },
    {
      provide: UpdateGoodsReceiptUseCase,
      useFactory: (
        grRepo: GoodsReceiptRepository,
        poRepo: PurchaseOrderRepository,
        productRepo: ProductRepository,
        uomRepo: UomRepository,
        conversionRepo: ProductUomConversionRepository,
      ) => new UpdateGoodsReceiptUseCase(grRepo, poRepo, productRepo, uomRepo, conversionRepo),
      inject: [
        GoodsReceiptRepository,
        PurchaseOrderRepository,
        ProductRepository,
        UomRepository,
        ProductUomConversionRepository,
      ],
    },
    {
      provide: CancelGoodsReceiptUseCase,
      useFactory: (grRepo: GoodsReceiptRepository) => new CancelGoodsReceiptUseCase(grRepo),
      inject: [GoodsReceiptRepository],
    },
    {
      provide: CompleteGoodsReceiptUseCase,
      useFactory: (grRepo: GoodsReceiptRepository) => new CompleteGoodsReceiptUseCase(grRepo),
      inject: [GoodsReceiptRepository],
    },
    {
      provide: GetGoodsReceiptsUseCase,
      useFactory: (grRepo: GoodsReceiptRepository) => new GetGoodsReceiptsUseCase(grRepo),
      inject: [GoodsReceiptRepository],
    },
    {
      provide: GetGoodsReceiptOutstandingUseCase,
      useFactory: (grRepo: GoodsReceiptRepository, poRepo: PurchaseOrderRepository) =>
        new GetGoodsReceiptOutstandingUseCase(grRepo, poRepo),
      inject: [GoodsReceiptRepository, PurchaseOrderRepository],
    },
    {
      provide: AddGoodsReceiptCommentUseCase,
      useFactory: (grRepo: GoodsReceiptRepository) =>
        new AddGoodsReceiptCommentUseCase(grRepo),
      inject: [GoodsReceiptRepository],
    },
    {
      provide: GetGoodsReceiptCommentsUseCase,
      useFactory: (grRepo: GoodsReceiptRepository) =>
        new GetGoodsReceiptCommentsUseCase(grRepo),
      inject: [GoodsReceiptRepository],
    },
    {
      provide: UploadGoodsReceiptAttachmentUseCase,
      useFactory: (
        grRepo: GoodsReceiptRepository,
        storage: GoodsReceiptAttachmentStorage,
      ) => new UploadGoodsReceiptAttachmentUseCase(grRepo, storage),
      inject: [GoodsReceiptRepository, GoodsReceiptAttachmentStorage],
    },
    {
      provide: ListGoodsReceiptAttachmentsUseCase,
      useFactory: (grRepo: GoodsReceiptRepository) =>
        new ListGoodsReceiptAttachmentsUseCase(grRepo),
      inject: [GoodsReceiptRepository],
    },
    {
      provide: GetGoodsReceiptAttachmentUseCase,
      useFactory: (
        grRepo: GoodsReceiptRepository,
        storage: GoodsReceiptAttachmentStorage,
      ) => new GetGoodsReceiptAttachmentUseCase(grRepo, storage),
      inject: [GoodsReceiptRepository, GoodsReceiptAttachmentStorage],
    },
    {
      provide: DeleteGoodsReceiptAttachmentUseCase,
      useFactory: (
        grRepo: GoodsReceiptRepository,
        storage: GoodsReceiptAttachmentStorage,
      ) => new DeleteGoodsReceiptAttachmentUseCase(grRepo, storage),
      inject: [GoodsReceiptRepository, GoodsReceiptAttachmentStorage],
    },
    {
      provide: CreatePurchaseReturnUseCase,
      useFactory: (
        prRepo: PurchaseReturnRepository,
        grRepo: GoodsReceiptRepository,
        supplierRepo: SupplierRepository,
        outletRepo: OutletRepository,
      ) => new CreatePurchaseReturnUseCase(prRepo, grRepo, supplierRepo, outletRepo),
      inject: [
        PurchaseReturnRepository,
        GoodsReceiptRepository,
        SupplierRepository,
        OutletRepository,
      ],
    },
    {
      provide: UpdatePurchaseReturnUseCase,
      useFactory: (
        prRepo: PurchaseReturnRepository,
        grRepo: GoodsReceiptRepository,
        supplierRepo: SupplierRepository,
        outletRepo: OutletRepository,
      ) => new UpdatePurchaseReturnUseCase(prRepo, grRepo, supplierRepo, outletRepo),
      inject: [
        PurchaseReturnRepository,
        GoodsReceiptRepository,
        SupplierRepository,
        OutletRepository,
      ],
    },
    {
      provide: SubmitPurchaseReturnUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) =>
        new SubmitPurchaseReturnUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: CompletePurchaseReturnUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) =>
        new CompletePurchaseReturnUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: CancelPurchaseReturnUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) =>
        new CancelPurchaseReturnUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: GetPurchaseReturnsUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) =>
        new GetPurchaseReturnsUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: GetReturnableUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) => new GetReturnableUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: AddPurchaseReturnCommentUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) =>
        new AddPurchaseReturnCommentUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: GetPurchaseReturnCommentsUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) =>
        new GetPurchaseReturnCommentsUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: UploadPurchaseReturnAttachmentUseCase,
      useFactory: (
        prRepo: PurchaseReturnRepository,
        storage: PurchaseReturnAttachmentStorage,
      ) => new UploadPurchaseReturnAttachmentUseCase(prRepo, storage),
      inject: [PurchaseReturnRepository, PurchaseReturnAttachmentStorage],
    },
    {
      provide: ListPurchaseReturnAttachmentsUseCase,
      useFactory: (prRepo: PurchaseReturnRepository) =>
        new ListPurchaseReturnAttachmentsUseCase(prRepo),
      inject: [PurchaseReturnRepository],
    },
    {
      provide: GetPurchaseReturnAttachmentUseCase,
      useFactory: (
        prRepo: PurchaseReturnRepository,
        storage: PurchaseReturnAttachmentStorage,
      ) => new GetPurchaseReturnAttachmentUseCase(prRepo, storage),
      inject: [PurchaseReturnRepository, PurchaseReturnAttachmentStorage],
    },
    {
      provide: DeletePurchaseReturnAttachmentUseCase,
      useFactory: (
        prRepo: PurchaseReturnRepository,
        storage: PurchaseReturnAttachmentStorage,
      ) => new DeletePurchaseReturnAttachmentUseCase(prRepo, storage),
      inject: [PurchaseReturnRepository, PurchaseReturnAttachmentStorage],
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
    PaymentTermRepository,
    CategoryRepository,
    ProductRepository,
    ProductUomConversionRepository,
    ProductToppingRepository,
    InventoryRepository,
    StockAdjustmentRepository,
    StockTransferRepository,
    StockOpnameRepository,
    ShiftRepository,
    SalesOrderRepository,
    RecipeRepository,
    ProductionOrderRepository,
    PurchaseRequestRepository,
    PurchaseOrderRepository,
    GoodsReceiptRepository,
    PurchaseReturnRepository,
    RegisterCompanyUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    CreateOutletUseCase,
    UpdateOutletUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    CreateProductGroupUseCase,
    UpdateProductGroupUseCase,
    DeleteProductGroupUseCase,
    CreateUomUseCase,
    UpdateUomUseCase,
    DeleteUomUseCase,
    CreateSupplierUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
    CreatePaymentTermUseCase,
    UpdatePaymentTermUseCase,
    DeletePaymentTermUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    ListProductUomConversionsUseCase,
    CreateProductUomConversionUseCase,
    UpdateProductUomConversionUseCase,
    DeleteProductUomConversionUseCase,
    ListProductToppingsUseCase,
    CreateProductToppingUseCase,
    UpdateProductToppingUseCase,
    DeleteProductToppingUseCase,
    GetStockOnHandUseCase,
    GetStockLedgerUseCase,
    GetBatchesUseCase,
    PlanFefoAllocationUseCase,
    CreateStockAdjustmentUseCase,
    UpdateStockAdjustmentUseCase,
    SubmitStockAdjustmentUseCase,
    ApproveStockAdjustmentUseCase,
    CancelStockAdjustmentUseCase,
    CompleteStockAdjustmentUseCase,
    GetStockAdjustmentsUseCase,
    CreateStockTransferUseCase,
    UpdateStockTransferUseCase,
    SubmitStockTransferUseCase,
    DispatchStockTransferUseCase,
    ReceiveStockTransferUseCase,
    CancelStockTransferUseCase,
    GetStockTransfersUseCase,
    CreateStockOpnameUseCase,
    StartStockOpnameUseCase,
    RecordCountUseCase,
    SubmitStockOpnameUseCase,
    ApproveStockOpnameUseCase,
    CompleteStockOpnameUseCase,
    CancelStockOpnameUseCase,
    GetStockOpnamesUseCase,
    OpenShiftUseCase,
    CloseShiftUseCase,
    GetShiftsUseCase,
    CreateSalesOrderUseCase,
    PaySalesOrderUseCase,
    VoidSalesOrderUseCase,
    RefundSalesOrderUseCase,
    GetSalesOrdersUseCase,
    GetInventoryDashboardUseCase,
    CreateRecipeUseCase,
    UpdateRecipeUseCase,
    ActivateRecipeUseCase,
    ArchiveRecipeUseCase,
    DeleteRecipeUseCase,
    GetRecipesUseCase,
    CreateProductionOrderUseCase,
    GetProductionOrdersUseCase,
    CreatePurchaseRequestUseCase,
    UpdatePurchaseRequestUseCase,
    SubmitPurchaseRequestUseCase,
    ApprovePurchaseRequestUseCase,
    RejectPurchaseRequestUseCase,
    CancelPurchaseRequestUseCase,
    GetPurchaseRequestsUseCase,
    AddPurchaseRequestCommentUseCase,
    GetPurchaseRequestCommentsUseCase,
    UploadPurchaseRequestAttachmentUseCase,
    ListPurchaseRequestAttachmentsUseCase,
    GetPurchaseRequestAttachmentUseCase,
    DeletePurchaseRequestAttachmentUseCase,
    CreatePurchaseOrderUseCase,
    UpdatePurchaseOrderUseCase,
    SubmitPurchaseOrderUseCase,
    ApprovePurchaseOrderUseCase,
    RejectPurchaseOrderUseCase,
    CancelPurchaseOrderUseCase,
    GetPurchaseOrdersUseCase,
    GetPurchaseOrderOutstandingUseCase,
    AddPurchaseOrderCommentUseCase,
    GetPurchaseOrderCommentsUseCase,
    UploadPurchaseOrderAttachmentUseCase,
    ListPurchaseOrderAttachmentsUseCase,
    GetPurchaseOrderAttachmentUseCase,
    DeletePurchaseOrderAttachmentUseCase,
    CreateGoodsReceiptUseCase,
    UpdateGoodsReceiptUseCase,
    CancelGoodsReceiptUseCase,
    CompleteGoodsReceiptUseCase,
    GetGoodsReceiptsUseCase,
    GetGoodsReceiptOutstandingUseCase,
    AddGoodsReceiptCommentUseCase,
    GetGoodsReceiptCommentsUseCase,
    UploadGoodsReceiptAttachmentUseCase,
    ListGoodsReceiptAttachmentsUseCase,
    GetGoodsReceiptAttachmentUseCase,
    DeleteGoodsReceiptAttachmentUseCase,
    CreatePurchaseReturnUseCase,
    UpdatePurchaseReturnUseCase,
    SubmitPurchaseReturnUseCase,
    CompletePurchaseReturnUseCase,
    CancelPurchaseReturnUseCase,
    GetPurchaseReturnsUseCase,
    GetReturnableUseCase,
    AddPurchaseReturnCommentUseCase,
    GetPurchaseReturnCommentsUseCase,
    UploadPurchaseReturnAttachmentUseCase,
    ListPurchaseReturnAttachmentsUseCase,
    GetPurchaseReturnAttachmentUseCase,
    DeletePurchaseReturnAttachmentUseCase,
  ],
})
export class InfrastructureModule {}
