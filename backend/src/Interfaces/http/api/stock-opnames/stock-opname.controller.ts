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
import { CreateStockOpnameUseCase } from '../../../../Applications/use_case/stock-opnames/CreateStockOpnameUseCase';
import { StartStockOpnameUseCase } from '../../../../Applications/use_case/stock-opnames/StartStockOpnameUseCase';
import { RecordCountUseCase } from '../../../../Applications/use_case/stock-opnames/RecordCountUseCase';
import { SubmitStockOpnameUseCase } from '../../../../Applications/use_case/stock-opnames/SubmitStockOpnameUseCase';
import { ApproveStockOpnameUseCase } from '../../../../Applications/use_case/stock-opnames/ApproveStockOpnameUseCase';
import { CompleteStockOpnameUseCase } from '../../../../Applications/use_case/stock-opnames/CompleteStockOpnameUseCase';
import { CancelStockOpnameUseCase } from '../../../../Applications/use_case/stock-opnames/CancelStockOpnameUseCase';
import { GetStockOpnamesUseCase } from '../../../../Applications/use_case/stock-opnames/GetStockOpnamesUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateStockOpnameDto } from './dto/create-stock-opname.dto';
import { RecordCountDto } from './dto/record-count.dto';
import { StockOpnameQueryDto } from './dto/stock-opname-query.dto';

/**
 * StockOpnameController — physical stock count documents.
 * Company-scoped; permission-guarded per inventory-domain §11 (inventory.stock-count.*).
 *
 * GET   /inventory/stock-counts              list
 * GET   /inventory/stock-counts/:id          detail
 * POST  /inventory/stock-counts              create draft
 * POST  /inventory/stock-counts/:id/start    DRAFT -> COUNTING (snapshot + lock)
 * PUT   /inventory/stock-counts/:id/items/:itemId/count   record physical count
 * POST  /inventory/stock-counts/:id/submit   COUNTING -> SUBMITTED
 * POST  /inventory/stock-counts/:id/approve  SUBMITTED -> APPROVED
 * POST  /inventory/stock-counts/:id/complete APPROVED -> COMPLETED (generate adjustment)
 * POST  /inventory/stock-counts/:id/cancel   -> CANCELLED
 */
@ApiTags('Stock Opname')
@ApiBearerAuth()
@Controller('inventory/stock-counts')
export class StockOpnameController {
  constructor(
    private readonly createUseCase: CreateStockOpnameUseCase,
    private readonly startUseCase: StartStockOpnameUseCase,
    private readonly recordCountUseCase: RecordCountUseCase,
    private readonly submitUseCase: SubmitStockOpnameUseCase,
    private readonly approveUseCase: ApproveStockOpnameUseCase,
    private readonly completeUseCase: CompleteStockOpnameUseCase,
    private readonly cancelUseCase: CancelStockOpnameUseCase,
    private readonly getUseCase: GetStockOpnamesUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.stock-count.read')
  @ApiOperation({ summary: 'List stock opnames' })
  @ApiResponse({ status: 200, description: 'Paginated opname list' })
  async list(@Query() query: StockOpnameQueryDto, @GetUser() user: JwtAccessPayload) {
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
  @RequirePermission('inventory.stock-count.read')
  @ApiOperation({ summary: 'Get a stock opname by ID' })
  @ApiParam({ name: 'id', description: 'Stock opname UUID' })
  @ApiResponse({ status: 200, description: 'Opname detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const opname = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(opname);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('inventory.stock-count.create')
  @ApiOperation({ summary: 'Create a stock opname draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  async create(@Body() dto: CreateStockOpnameDto, @GetUser() user: JwtAccessPayload) {
    const opname = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(opname);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.stock-count.create')
  @ApiOperation({ summary: 'Start counting (DRAFT -> COUNTING, snapshots + locks outlet)' })
  @ApiParam({ name: 'id', description: 'Stock opname UUID' })
  @ApiResponse({ status: 200, description: 'Counting started; items snapshotted' })
  @ApiResponse({ status: 400, description: 'Invalid transition or outlet locked' })
  async start(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const opname = await this.startUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(opname);
  }

  @Put(':id/items/:itemId/count')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.stock-count.update')
  @ApiOperation({ summary: 'Record a physical count for an opname item' })
  @ApiParam({ name: 'id', description: 'Stock opname UUID' })
  @ApiParam({ name: 'itemId', description: 'Opname item UUID' })
  @ApiResponse({ status: 200, description: 'Count recorded' })
  @ApiResponse({ status: 400, description: 'Opname not in COUNTING state' })
  async recordCount(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: RecordCountDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const opname = await this.recordCountUseCase.execute(id, itemId, dto, this._companyId(user));
    return successResponse(opname);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.stock-count.update')
  @ApiOperation({ summary: 'Submit counts (COUNTING -> SUBMITTED)' })
  @ApiParam({ name: 'id', description: 'Stock opname UUID' })
  @ApiResponse({ status: 200, description: 'Submitted' })
  async submit(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const opname = await this.submitUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(opname);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.stock-count.approve')
  @ApiOperation({ summary: 'Approve counts (SUBMITTED -> APPROVED)' })
  @ApiParam({ name: 'id', description: 'Stock opname UUID' })
  @ApiResponse({ status: 200, description: 'Approved' })
  async approve(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const opname = await this.approveUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(opname);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.stock-count.complete')
  @ApiOperation({
    summary: 'Complete (APPROVED -> COMPLETED, generates reconciling adjustment on variance)',
  })
  @ApiParam({ name: 'id', description: 'Stock opname UUID' })
  @ApiResponse({ status: 200, description: 'Completed; variance reconciled' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  async complete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const opname = await this.completeUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(opname);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.stock-count.update')
  @ApiOperation({ summary: 'Cancel an opname (releases outlet lock)' })
  @ApiParam({ name: 'id', description: 'Stock opname UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  async cancel(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const opname = await this.cancelUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(opname);
  }
}
