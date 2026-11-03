import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetStockOnHandUseCase } from '../../../../Applications/use_case/inventory/GetStockOnHandUseCase';
import { GetStockLedgerUseCase } from '../../../../Applications/use_case/inventory/GetStockLedgerUseCase';
import { GetBatchesUseCase } from '../../../../Applications/use_case/inventory/GetBatchesUseCase';
import { GetInventoryDashboardUseCase } from '../../../../Applications/use_case/inventory/GetInventoryDashboardUseCase';
import { InventoryRepository } from '../../../../Domains/inventory/InventoryRepository';
import { classifyExpiry, deriveOperationalStatus } from '../../../../Domains/inventory/batchStatus';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { StockOnHandQueryDto } from './dto/stock-on-hand-query.dto';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { BatchesQueryDto } from './dto/batches-query.dto';

/**
 * InventoryController — read-side inventory monitoring (Sprint 3 Fase 1).
 * Outlet-native, company-scoped, permission-guarded (inventory.read).
 *
 * GET /api/v1/inventory/stock-on-hand   → current balances per product+outlet
 * GET /api/v1/inventory/ledger          → immutable movement ledger
 * GET /api/v1/inventory/batches         → batch & expiry monitoring
 * GET /api/v1/inventory/batches/:id     → single batch detail (with expiry state)
 */
@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly getStockOnHandUseCase: GetStockOnHandUseCase,
    private readonly getStockLedgerUseCase: GetStockLedgerUseCase,
    private readonly getBatchesUseCase: GetBatchesUseCase,
    private readonly getInventoryDashboardUseCase: GetInventoryDashboardUseCase,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Read-only inventory dashboard summary metrics' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated inventory metrics',
    schema: {
      example: {
        success: true,
        data: {
          totalActiveBatches: 42,
          totalProductsInStock: 30,
          lowStockCount: 3,
          expiringSoonCount: 5,
          expiredCount: 1,
          inTransitTransfers: 2,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — missing inventory.read' })
  async dashboard(
    @Query('outletId') outletId: string | undefined,
    @GetUser() user: JwtAccessPayload,
  ) {
    const summary = await this.getInventoryDashboardUseCase.execute(
      this._companyId(user),
      outletId,
    );
    return successResponse(summary);
  }

  @Get('stock-on-hand')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'List current Stock-On-Hand per product and outlet' })
  @ApiResponse({ status: 200, description: 'Paginated stock-on-hand list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing inventory.read' })
  async stockOnHand(@Query() query: StockOnHandQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.getStockOnHandUseCase.execute(
      {
        limit,
        offset,
        outletId: query.outletId,
        productId: query.productId,
        search: query.search,
        lowOnly: query.lowOnly === 'true',
      },
      companyId,
    );

    return listResponse(rows, total, page, limit);
  }

  @Get('ledger')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'List the immutable inventory movement ledger' })
  @ApiResponse({ status: 200, description: 'Paginated ledger list' })
  @ApiResponse({ status: 400, description: 'Invalid movement type filter' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing inventory.read' })
  async ledger(@Query() query: LedgerQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.getStockLedgerUseCase.execute(
      {
        limit,
        offset,
        outletId: query.outletId,
        productId: query.productId,
        batchId: query.batchId,
        movementType: query.movementType,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
      companyId,
    );

    return listResponse(rows, total, page, limit);
  }

  @Get('batches')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Batch & Expiry monitoring over inventory batches' })
  @ApiResponse({ status: 200, description: 'Paginated batch list with expiry state' })
  @ApiResponse({ status: 400, description: 'Invalid batch status filter' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing inventory.read' })
  async batches(@Query() query: BatchesQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.getBatchesUseCase.execute(
      {
        limit,
        offset,
        outletId: query.outletId,
        productId: query.productId,
        status: query.status,
        operationalStatus: query.operationalStatus,
        includeNonBatch: query.includeNonBatch === 'true',
      },
      companyId,
    );

    return listResponse(rows, total, page, limit);
  }

  @Get('batches/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Get a single inventory batch with derived expiry state' })
  @ApiParam({ name: 'id', description: 'Inventory batch UUID' })
  @ApiResponse({ status: 200, description: 'Batch detail' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async batchDetail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const batch = await this.inventoryRepository.getBatchById(id, companyId);
    const expiryState = classifyExpiry(batch.expiredDate, new Date(), batch.isNonBatch);
    const operationalStatus = deriveOperationalStatus(batch.status, expiryState);
    return successResponse({ batch, expiryState, operationalStatus });
  }
}
