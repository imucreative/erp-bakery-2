import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateProductionOrderUseCase } from '../../../../Applications/use_case/production/CreateProductionOrderUseCase';
import { GetProductionOrdersUseCase } from '../../../../Applications/use_case/production/GetProductionOrdersUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { ProductionOrderQueryDto } from './dto/production-order-query.dto';
import { ProducibleQueryDto } from './dto/producible-query.dto';

/**
 * ProductionOrderController — converts ingredients into finished goods.
 * Company-scoped; permission-guarded (production-order.read / .manage).
 *
 * Production is INSTANT-COMPLETE: creating a production order runs the whole
 * production (backflush ingredients FEFO + produce finished goods, atomic) and
 * lands the order on COMPLETED. There are no start/yield/qa/complete/cancel
 * actions.
 *
 * GET   /production/orders       list
 * GET   /production/orders/:id   detail
 * POST  /production/orders       run production (create = COMPLETED)
 */
@ApiTags('Production Orders')
@ApiBearerAuth()
@Controller('production/orders')
export class ProductionOrderController {
  constructor(
    private readonly createUseCase: CreateProductionOrderUseCase,
    private readonly getUseCase: GetProductionOrdersUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.read')
  @ApiOperation({ summary: 'List production orders' })
  @ApiResponse({ status: 200, description: 'Paginated production order list' })
  async list(@Query() query: ProductionOrderQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      {
        limit,
        offset,
        outletId: query.outletId,
        productId: query.productId,
        status: query.status,
        search: query.search,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.read')
  @ApiOperation({ summary: 'Get a production order by ID' })
  @ApiParam({ name: 'id', description: 'Production order UUID' })
  @ApiResponse({ status: 200, description: 'Production order detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const order = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(order);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('production-order.manage')
  @ApiOperation({
    summary: 'Run a production order (instant-complete: create = COMPLETED, backflushing)',
  })
  @ApiResponse({ status: 201, description: 'Produced; stock consumed and finished goods created' })
  @ApiResponse({ status: 400, description: 'Validation error or insufficient ingredient stock' })
  @ApiResponse({ status: 404, description: 'Outlet or active recipe not found' })
  async create(@Body() dto: CreateProductionOrderDto, @GetUser() user: JwtAccessPayload) {
    const order = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(order);
  }
}

/**
 * ProductionController — read-only production helpers mounted directly under
 * /production (sibling to /production/orders).
 *
 * GET /production/producible — producible-quantity (capacity) preview for a
 * finished product at an outlet. Company-scoped; guarded by
 * production-order.read (consistent with production reads). READ-ONLY: computes
 * from current ingredient stock, posts no movements, mutates nothing. The
 * ingredient consumption math reuses the exact instant-complete backflushing
 * formula, so the previewed producible quantity equals what a submit would run.
 */
@ApiTags('Production')
@ApiBearerAuth()
@Controller('production')
export class ProductionController {
  constructor(private readonly getUseCase: GetProductionOrdersUseCase) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get('producible')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.read')
  @ApiOperation({
    summary: 'Producible quantity preview (max finished units from current ingredient stock)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Active recipe, max producible finished units, and per-ingredient requirement/availability',
  })
  @ApiResponse({ status: 404, description: 'Outlet or active recipe not found' })
  async producible(@Query() query: ProducibleQueryDto, @GetUser() user: JwtAccessPayload) {
    const result = await this.getUseCase.producible(
      query.productId,
      query.outletId,
      this._companyId(user),
    );
    return successResponse({
      productId: query.productId,
      outletId: query.outletId,
      recipe: result.recipe,
      producibleQty: result.producibleQty,
      items: result.items.map((item) => ({
        ingredientProductId: item.ingredientProductId,
        ingredientProductName: item.ingredientProductName,
        uomId: item.uomId,
        uomName: item.uomName,
        requiredPerUnit: item.requiredPerUnit,
        availableQty: item.availableQty,
        isLimiting: item.isLimiting,
      })),
    });
  }
}
