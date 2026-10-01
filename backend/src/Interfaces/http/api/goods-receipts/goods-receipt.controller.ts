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
import { CreateGoodsReceiptUseCase } from '../../../../Applications/use_case/goods-receipts/CreateGoodsReceiptUseCase';
import { UpdateGoodsReceiptUseCase } from '../../../../Applications/use_case/goods-receipts/UpdateGoodsReceiptUseCase';
import { CancelGoodsReceiptUseCase } from '../../../../Applications/use_case/goods-receipts/CancelGoodsReceiptUseCase';
import { GetGoodsReceiptsUseCase } from '../../../../Applications/use_case/goods-receipts/GetGoodsReceiptsUseCase';
import { GetGoodsReceiptOutstandingUseCase } from '../../../../Applications/use_case/goods-receipts/GetGoodsReceiptOutstandingUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { GoodsReceiptQueryDto } from './dto/goods-receipt-query.dto';
import { GoodsReceiptActionDto } from './dto/goods-receipt-action.dto';
import { GoodsReceiptOutstandingQueryDto } from './dto/goods-receipt-outstanding-query.dto';

/**
 * GoodsReceiptController — third procurement document module (doc 26).
 * Company-scoped; permission-guarded per doc 26 §11 / doc 16.
 *
 * STAGE 1 scope: core document + approval timeline (status logs). NO inventory
 * posting — the complete action (DRAFT -> COMPLETED, which posts accepted
 * quantities to inventory) arrives in a separate Stage 2. Comments & attachments
 * are later stages. The status VO already defines DRAFT -> COMPLETED so Stage 2
 * can add the action without touching the state machine.
 *
 * Permission mapping decisions (doc 26 §11):
 *   read               → procurement.gr.read
 *   create             → procurement.gr.create   (POST)
 *   update             → procurement.gr.update    (PUT, DRAFT only)
 *   cancel             → procurement.gr.update    (voiding a draft)
 *   outstanding lookup → procurement.gr.create    (used while opening the receive form)
 *   (complete          → procurement.gr.complete  — Stage 2)
 *
 * A GR is raised from an APPROVED PO; supplier and destination outlet are
 * inherited (snapshotted) from the PO, never taken from the client. Quantities
 * are locked to each PO line's OUTSTANDING across sibling GRs. Company-scope is
 * enforced; outlet-scope and nominal approval limits are deferred by project
 * decision (DocumentAuthorizationService doc 43 does not yet exist).
 */
@ApiTags('Goods Receipts')
@ApiBearerAuth()
@Controller('goods-receipts')
export class GoodsReceiptController {
  constructor(
    private readonly createUseCase: CreateGoodsReceiptUseCase,
    private readonly updateUseCase: UpdateGoodsReceiptUseCase,
    private readonly cancelUseCase: CancelGoodsReceiptUseCase,
    private readonly getUseCase: GetGoodsReceiptsUseCase,
    private readonly getOutstandingUseCase: GetGoodsReceiptOutstandingUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.gr.read')
  @ApiOperation({ summary: 'List goods receipts' })
  @ApiResponse({ status: 200, description: 'Paginated goods receipt list' })
  async list(@Query() query: GoodsReceiptQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      {
        limit,
        offset,
        status: query.status,
        purchaseOrderId: query.purchaseOrderId,
        supplierId: query.supplierId,
        destinationOutletId: query.destinationOutletId,
        search: query.search,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get('outstanding')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.gr.create')
  @ApiOperation({
    summary:
      'Outstanding (remaining receivable) quantity per source PO line for a new/edited GR',
  })
  @ApiResponse({
    status: 200,
    description:
      'Per-PO-line outstanding = PO qty minus (accepted+rejected) consumed by sibling GRs',
  })
  @ApiResponse({ status: 404, description: 'Source purchase order not found' })
  async outstanding(
    @Query() query: GoodsReceiptOutstandingQueryDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const result = await this.getOutstandingUseCase.execute(
      query.purchaseOrderId,
      this._companyId(user),
      query.excludeGoodsReceiptId,
    );
    return successResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.gr.read')
  @ApiOperation({ summary: 'Get a goods receipt by ID (with items and timeline)' })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
  @ApiResponse({ status: 200, description: 'Goods receipt detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const gr = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(gr);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.gr.create')
  @ApiOperation({ summary: 'Create a goods receipt draft from an APPROVED purchase order' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({
    status: 400,
    description: 'Validation error / PO not approved / qty exceeds outstanding / batch required',
  })
  async create(@Body() dto: CreateGoodsReceiptDto, @GetUser() user: JwtAccessPayload) {
    const gr = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(gr);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.gr.update')
  @ApiOperation({ summary: 'Update a goods receipt (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 400, description: 'Not in editable status' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const gr = await this.updateUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(gr);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.gr.update')
  @ApiOperation({ summary: 'Cancel a goods receipt (DRAFT -> CANCELLED, soft-delete)' })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: GoodsReceiptActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const gr = await this.cancelUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(gr);
  }
}
