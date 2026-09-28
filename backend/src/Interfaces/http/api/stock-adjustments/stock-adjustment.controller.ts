import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateStockAdjustmentUseCase } from '../../../../Applications/use_case/stock-adjustments/CreateStockAdjustmentUseCase';
import { UpdateStockAdjustmentUseCase } from '../../../../Applications/use_case/stock-adjustments/UpdateStockAdjustmentUseCase';
import { SubmitStockAdjustmentUseCase } from '../../../../Applications/use_case/stock-adjustments/SubmitStockAdjustmentUseCase';
import { ApproveStockAdjustmentUseCase } from '../../../../Applications/use_case/stock-adjustments/ApproveStockAdjustmentUseCase';
import { CancelStockAdjustmentUseCase } from '../../../../Applications/use_case/stock-adjustments/CancelStockAdjustmentUseCase';
import { CompleteStockAdjustmentUseCase } from '../../../../Applications/use_case/stock-adjustments/CompleteStockAdjustmentUseCase';
import { GetStockAdjustmentsUseCase } from '../../../../Applications/use_case/stock-adjustments/GetStockAdjustmentsUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { UpdateStockAdjustmentDto } from './dto/update-stock-adjustment.dto';
import { StockAdjustmentQueryDto } from './dto/stock-adjustment-query.dto';

/**
 * StockAdjustmentController — inventory stock correction documents.
 * Company-scoped; permission-guarded per inventory-domain §11.
 *
 * GET    /inventory/adjustments            list
 * GET    /inventory/adjustments/:id        detail
 * POST   /inventory/adjustments            create draft
 * PUT    /inventory/adjustments/:id        update draft
 * POST   /inventory/adjustments/:id/submit   DRAFT -> SUBMITTED
 * POST   /inventory/adjustments/:id/approve  SUBMITTED -> APPROVED
 * POST   /inventory/adjustments/:id/cancel   DRAFT|SUBMITTED -> CANCELLED
 * POST   /inventory/adjustments/:id/complete APPROVED -> COMPLETED (posts stock)
 */
@ApiTags('Stock Adjustments')
@ApiBearerAuth()
@Controller('inventory/adjustments')
export class StockAdjustmentController {
  constructor(
    private readonly createUseCase: CreateStockAdjustmentUseCase,
    private readonly updateUseCase: UpdateStockAdjustmentUseCase,
    private readonly submitUseCase: SubmitStockAdjustmentUseCase,
    private readonly approveUseCase: ApproveStockAdjustmentUseCase,
    private readonly cancelUseCase: CancelStockAdjustmentUseCase,
    private readonly completeUseCase: CompleteStockAdjustmentUseCase,
    private readonly getUseCase: GetStockAdjustmentsUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.adjustment.read')
  @ApiOperation({ summary: 'List stock adjustments' })
  @ApiResponse({ status: 200, description: 'Paginated adjustment list' })
  async list(@Query() query: StockAdjustmentQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      { limit, offset, outletId: query.outletId, status: query.status, search: query.search },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.adjustment.read')
  @ApiOperation({ summary: 'Get a stock adjustment by ID' })
  @ApiParam({ name: 'id', description: 'Stock adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Adjustment detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const adjustment = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(adjustment);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('inventory.adjustment.create')
  @ApiOperation({ summary: 'Create a stock adjustment draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateStockAdjustmentDto, @GetUser() user: JwtAccessPayload) {
    const adjustment = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(adjustment);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.adjustment.update')
  @ApiOperation({ summary: 'Update a stock adjustment draft (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Stock adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Draft updated' })
  @ApiResponse({ status: 400, description: 'Not a draft or validation error' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStockAdjustmentDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const adjustment = await this.updateUseCase.execute(id, dto, this._companyId(user));
    return successResponse(adjustment);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.adjustment.update')
  @ApiOperation({ summary: 'Submit a draft (DRAFT -> SUBMITTED)' })
  @ApiParam({ name: 'id', description: 'Stock adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Submitted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async submit(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const adjustment = await this.submitUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(adjustment);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.adjustment.approve')
  @ApiOperation({ summary: 'Approve a submitted adjustment (SUBMITTED -> APPROVED)' })
  @ApiParam({ name: 'id', description: 'Stock adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Approved' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async approve(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const adjustment = await this.approveUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(adjustment);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.adjustment.update')
  @ApiOperation({ summary: 'Cancel a draft or submitted adjustment' })
  @ApiParam({ name: 'id', description: 'Stock adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async cancel(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const adjustment = await this.cancelUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(adjustment);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.adjustment.complete')
  @ApiOperation({
    summary: 'Complete an approved adjustment (APPROVED -> COMPLETED, posts stock)',
  })
  @ApiParam({ name: 'id', description: 'Stock adjustment UUID' })
  @ApiResponse({ status: 200, description: 'Completed and stock posted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition or insufficient stock' })
  async complete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const adjustment = await this.completeUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(adjustment);
  }
}
