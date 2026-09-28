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
import { CreateStockTransferUseCase } from '../../../../Applications/use_case/stock-transfers/CreateStockTransferUseCase';
import { UpdateStockTransferUseCase } from '../../../../Applications/use_case/stock-transfers/UpdateStockTransferUseCase';
import { SubmitStockTransferUseCase } from '../../../../Applications/use_case/stock-transfers/SubmitStockTransferUseCase';
import { DispatchStockTransferUseCase } from '../../../../Applications/use_case/stock-transfers/DispatchStockTransferUseCase';
import { ReceiveStockTransferUseCase } from '../../../../Applications/use_case/stock-transfers/ReceiveStockTransferUseCase';
import { CancelStockTransferUseCase } from '../../../../Applications/use_case/stock-transfers/CancelStockTransferUseCase';
import { GetStockTransfersUseCase } from '../../../../Applications/use_case/stock-transfers/GetStockTransfersUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { UpdateStockTransferDto } from './dto/update-stock-transfer.dto';
import { StockTransferQueryDto } from './dto/stock-transfer-query.dto';

/**
 * StockTransferController — inter-outlet stock transfers.
 * Company-scoped; permission-guarded per inventory-domain §11.
 *
 * GET    /inventory/transfers            list
 * GET    /inventory/transfers/:id        detail
 * POST   /inventory/transfers            create draft
 * PUT    /inventory/transfers/:id        update draft
 * POST   /inventory/transfers/:id/submit    DRAFT -> SUBMITTED
 * POST   /inventory/transfers/:id/dispatch  SUBMITTED -> IN_TRANSIT (TRANSFER_OUT)
 * POST   /inventory/transfers/:id/receive   IN_TRANSIT -> COMPLETED (TRANSFER_IN)
 * POST   /inventory/transfers/:id/cancel    DRAFT|SUBMITTED -> CANCELLED
 */
@ApiTags('Stock Transfers')
@ApiBearerAuth()
@Controller('inventory/transfers')
export class StockTransferController {
  constructor(
    private readonly createUseCase: CreateStockTransferUseCase,
    private readonly updateUseCase: UpdateStockTransferUseCase,
    private readonly submitUseCase: SubmitStockTransferUseCase,
    private readonly dispatchUseCase: DispatchStockTransferUseCase,
    private readonly receiveUseCase: ReceiveStockTransferUseCase,
    private readonly cancelUseCase: CancelStockTransferUseCase,
    private readonly getUseCase: GetStockTransfersUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.transfer.read')
  @ApiOperation({ summary: 'List stock transfers' })
  @ApiResponse({ status: 200, description: 'Paginated transfer list' })
  async list(@Query() query: StockTransferQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      {
        limit,
        offset,
        sourceOutletId: query.sourceOutletId,
        destinationOutletId: query.destinationOutletId,
        status: query.status,
        search: query.search,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.transfer.read')
  @ApiOperation({ summary: 'Get a stock transfer by ID' })
  @ApiParam({ name: 'id', description: 'Stock transfer UUID' })
  @ApiResponse({ status: 200, description: 'Transfer detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const transfer = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(transfer);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('inventory.transfer.create')
  @ApiOperation({ summary: 'Create a stock transfer draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateStockTransferDto, @GetUser() user: JwtAccessPayload) {
    const transfer = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(transfer);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.transfer.create')
  @ApiOperation({ summary: 'Update a stock transfer draft (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Stock transfer UUID' })
  @ApiResponse({ status: 200, description: 'Draft updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStockTransferDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const transfer = await this.updateUseCase.execute(id, dto, this._companyId(user));
    return successResponse(transfer);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.transfer.create')
  @ApiOperation({ summary: 'Submit a draft (DRAFT -> SUBMITTED)' })
  @ApiParam({ name: 'id', description: 'Stock transfer UUID' })
  @ApiResponse({ status: 200, description: 'Submitted' })
  async submit(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const transfer = await this.submitUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(transfer);
  }

  @Post(':id/dispatch')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.transfer.dispatch')
  @ApiOperation({ summary: 'Dispatch (SUBMITTED -> IN_TRANSIT, posts TRANSFER_OUT)' })
  @ApiParam({ name: 'id', description: 'Stock transfer UUID' })
  @ApiResponse({ status: 200, description: 'Dispatched; source stock decreased' })
  @ApiResponse({ status: 400, description: 'Invalid transition or insufficient stock' })
  async dispatch(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const transfer = await this.dispatchUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(transfer);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.transfer.receive')
  @ApiOperation({ summary: 'Receive (IN_TRANSIT -> COMPLETED, posts TRANSFER_IN)' })
  @ApiParam({ name: 'id', description: 'Stock transfer UUID' })
  @ApiResponse({ status: 200, description: 'Received; destination stock increased' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  async receive(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const transfer = await this.receiveUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(transfer);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('inventory.transfer.create')
  @ApiOperation({ summary: 'Cancel a draft or submitted transfer' })
  @ApiParam({ name: 'id', description: 'Stock transfer UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  async cancel(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const transfer = await this.cancelUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(transfer);
  }
}
