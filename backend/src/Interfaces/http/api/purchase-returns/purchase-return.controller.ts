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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/CreatePurchaseReturnUseCase';
import { UpdatePurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/UpdatePurchaseReturnUseCase';
import { SubmitPurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/SubmitPurchaseReturnUseCase';
import { CompletePurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/CompletePurchaseReturnUseCase';
import { CancelPurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/CancelPurchaseReturnUseCase';
import { GetPurchaseReturnsUseCase } from '../../../../Applications/use_case/purchase-returns/GetPurchaseReturnsUseCase';
import { GetReturnableUseCase } from '../../../../Applications/use_case/purchase-returns/GetReturnableUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';
import { PurchaseReturnQueryDto } from './dto/purchase-return-query.dto';
import { ReturnableQueryDto } from './dto/returnable-query.dto';
import { PurchaseReturnActionDto } from './dto/purchase-return-action.dto';

/**
 * PurchaseReturnController — fourth procurement document module (doc 26 §6
 * #14–#20). Company-scoped; permission-guarded per doc 16 / doc 26 §11.
 *
 * A Purchase Return sends goods received on a COMPLETED Goods Receipt BACK to
 * the vendor. supplier + outlet are inherited (snapshotted) from the source GR,
 * never taken from the client. Returnable quantity is DERIVED from the GR's
 * posted accepted PURCHASE inventory movements minus completed + submitted
 * returns (doc 26 §6 #14–#16/#18).
 *
 * Lifecycle (approved — NO APPROVED step): DRAFT -> SUBMITTED -> COMPLETED, plus
 * DRAFT|SUBMITTED -> CANCELLED. SUBMITTED reserves returnable; COMPLETED posts
 * the RETURN inventory reversal atomically; CANCELLED releases the reservation.
 *
 * Permission mapping (doc 26 §11, doc 16 §7.3):
 *   read               → procurement.return.read
 *   returnable lookup  → procurement.return.create   (used while opening the return form)
 *   create             → procurement.return.create   (POST)
 *   update             → procurement.return.update    (PUT, DRAFT only)
 *   submit             → procurement.return.create    (raising the document for action)
 *   cancel             → procurement.return.update     (voiding a draft/submitted return)
 *   complete           → procurement.return.complete   (posts the inventory reversal)
 *
 * Company-scope is enforced; outlet-scope and nominal approval limits are
 * deferred by project decision (DocumentAuthorizationService doc 43 does not yet
 * exist), matching the Goods Receipt module. Comments & attachments are Stage 2.
 */
@ApiTags('Purchase Returns')
@ApiBearerAuth()
@Controller('purchase-returns')
export class PurchaseReturnController {
  constructor(
    private readonly createUseCase: CreatePurchaseReturnUseCase,
    private readonly updateUseCase: UpdatePurchaseReturnUseCase,
    private readonly submitUseCase: SubmitPurchaseReturnUseCase,
    private readonly completeUseCase: CompletePurchaseReturnUseCase,
    private readonly cancelUseCase: CancelPurchaseReturnUseCase,
    private readonly getUseCase: GetPurchaseReturnsUseCase,
    private readonly getReturnableUseCase: GetReturnableUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.read')
  @ApiOperation({ summary: 'List purchase returns' })
  @ApiResponse({ status: 200, description: 'Paginated purchase return list' })
  async list(@Query() query: PurchaseReturnQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      {
        limit,
        offset,
        status: query.status,
        goodsReceiptId: query.goodsReceiptId,
        supplierId: query.supplierId,
        outletId: query.outletId,
        search: query.search,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get('returnable')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.create')
  @ApiOperation({
    summary:
      'Returnable (remaining returnable) quantity per source GR line for a new/edited return',
  })
  @ApiResponse({
    status: 200,
    description:
      'Per-GR-line returnable = posted accepted qty minus completed + submitted returns',
  })
  @ApiResponse({ status: 400, description: 'Source goods receipt is not COMPLETED' })
  @ApiResponse({ status: 404, description: 'Source goods receipt not found' })
  async returnable(
    @Query() query: ReturnableQueryDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const result = await this.getReturnableUseCase.execute(
      query.goodsReceiptId,
      this._companyId(user),
    );
    return successResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.read')
  @ApiOperation({ summary: 'Get a purchase return by ID (with items and timeline)' })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({ status: 200, description: 'Purchase return detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const pr = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(pr);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.return.create')
  @ApiOperation({ summary: 'Create a purchase return draft from a COMPLETED goods receipt' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({
    status: 400,
    description:
      'Validation error / GR not completed / qty exceeds returnable / reason description required',
  })
  async create(@Body() dto: CreatePurchaseReturnDto, @GetUser() user: JwtAccessPayload) {
    const pr = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(pr);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.update')
  @ApiOperation({ summary: 'Update a purchase return (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 400, description: 'Not in editable status' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseReturnDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const pr = await this.updateUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(pr);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.create')
  @ApiOperation({ summary: 'Submit a purchase return (DRAFT -> SUBMITTED); reserves returnable' })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({ status: 200, description: 'Submitted' })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition / return qty exceeds returnable',
  })
  async submit(
    @Param('id') id: string,
    @Body() dto: PurchaseReturnActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const pr = await this.submitUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(pr);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.complete')
  @ApiOperation({
    summary:
      'Complete a purchase return (SUBMITTED -> COMPLETED); posts the RETURN inventory reversal',
  })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({
    status: 200,
    description:
      'Completed; return lines posted as RETURN inventory movements (idempotent if already completed)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition / insufficient stock to return',
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  async complete(
    @Param('id') id: string,
    @Body() dto: PurchaseReturnActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const pr = await this.completeUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(pr);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.update')
  @ApiOperation({
    summary: 'Cancel a purchase return (DRAFT|SUBMITTED -> CANCELLED, stays visible)',
  })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: PurchaseReturnActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const pr = await this.cancelUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(pr);
  }
}
