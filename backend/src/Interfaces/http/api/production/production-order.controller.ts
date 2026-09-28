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
import { StartProductionOrderUseCase } from '../../../../Applications/use_case/production/StartProductionOrderUseCase';
import { RecordYieldUseCase } from '../../../../Applications/use_case/production/RecordYieldUseCase';
import { QaCheckUseCase } from '../../../../Applications/use_case/production/QaCheckUseCase';
import { CompleteProductionOrderUseCase } from '../../../../Applications/use_case/production/CompleteProductionOrderUseCase';
import { CancelProductionOrderUseCase } from '../../../../Applications/use_case/production/CancelProductionOrderUseCase';
import { GetProductionOrdersUseCase } from '../../../../Applications/use_case/production/GetProductionOrdersUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { RecordYieldDto } from './dto/record-yield.dto';
import { QaCheckDto } from './dto/qa-check.dto';
import { CancelProductionOrderDto } from './dto/cancel-production-order.dto';
import { ProductionOrderQueryDto } from './dto/production-order-query.dto';

/**
 * ProductionOrderController — converts ingredients into finished goods.
 * Company-scoped; permission-guarded (production-order.read / .manage).
 *
 * Lifecycle: SCHEDULED -> IN_PROGRESS -> YIELD_COMPLETED -> QA_PASSED|QA_FAILED
 *            -> COMPLETED (backflushing); SCHEDULED -> CANCELLED.
 *
 * GET   /production/orders                 list
 * GET   /production/orders/:id             detail
 * POST  /production/orders                 schedule
 * POST  /production/orders/:id/start       SCHEDULED -> IN_PROGRESS
 * POST  /production/orders/:id/yield       IN_PROGRESS -> YIELD_COMPLETED
 * POST  /production/orders/:id/qa          YIELD_COMPLETED -> QA_PASSED|QA_FAILED
 * POST  /production/orders/:id/complete    QA_* -> COMPLETED (consume + produce)
 * POST  /production/orders/:id/cancel      SCHEDULED -> CANCELLED
 */
@ApiTags('Production Orders')
@ApiBearerAuth()
@Controller('production/orders')
export class ProductionOrderController {
  constructor(
    private readonly createUseCase: CreateProductionOrderUseCase,
    private readonly startUseCase: StartProductionOrderUseCase,
    private readonly recordYieldUseCase: RecordYieldUseCase,
    private readonly qaCheckUseCase: QaCheckUseCase,
    private readonly completeUseCase: CompleteProductionOrderUseCase,
    private readonly cancelUseCase: CancelProductionOrderUseCase,
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
  @ApiOperation({ summary: 'Schedule a production order' })
  @ApiResponse({ status: 201, description: 'Scheduled' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateProductionOrderDto, @GetUser() user: JwtAccessPayload) {
    const order = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(order);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.manage')
  @ApiOperation({ summary: 'Start production (SCHEDULED -> IN_PROGRESS)' })
  @ApiParam({ name: 'id', description: 'Production order UUID' })
  @ApiResponse({ status: 200, description: 'Started' })
  async start(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const order = await this.startUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(order);
  }

  @Post(':id/yield')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.manage')
  @ApiOperation({ summary: 'Record yield (IN_PROGRESS -> YIELD_COMPLETED)' })
  @ApiParam({ name: 'id', description: 'Production order UUID' })
  @ApiResponse({ status: 200, description: 'Yield recorded' })
  async recordYield(
    @Param('id') id: string,
    @Body() dto: RecordYieldDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const order = await this.recordYieldUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(order);
  }

  @Post(':id/qa')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.manage')
  @ApiOperation({ summary: 'QA check (YIELD_COMPLETED -> QA_PASSED | QA_FAILED)' })
  @ApiParam({ name: 'id', description: 'Production order UUID' })
  @ApiResponse({ status: 200, description: 'QA recorded' })
  async qaCheck(
    @Param('id') id: string,
    @Body() dto: QaCheckDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const order = await this.qaCheckUseCase.execute(
      id,
      dto.passed,
      this._companyId(user),
      dto.qaNotes ?? null,
      user.sub,
    );
    return successResponse(order);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.manage')
  @ApiOperation({
    summary: 'Complete production (QA_PASSED|QA_FAILED -> COMPLETED, backflushing)',
  })
  @ApiParam({ name: 'id', description: 'Production order UUID' })
  @ApiResponse({ status: 200, description: 'Completed; stock consumed/produced' })
  @ApiResponse({ status: 400, description: 'Insufficient ingredient stock' })
  async complete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const order = await this.completeUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(order);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('production-order.manage')
  @ApiOperation({ summary: 'Cancel a production order (SCHEDULED -> CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Production order UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelProductionOrderDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const order = await this.cancelUseCase.execute(
      id,
      this._companyId(user),
      dto.reason ?? null,
      user.sub,
    );
    return successResponse(order);
  }
}
