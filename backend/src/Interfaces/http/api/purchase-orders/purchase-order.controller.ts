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
import { CreatePurchaseOrderUseCase } from '../../../../Applications/use_case/purchase-orders/CreatePurchaseOrderUseCase';
import { UpdatePurchaseOrderUseCase } from '../../../../Applications/use_case/purchase-orders/UpdatePurchaseOrderUseCase';
import { SubmitPurchaseOrderUseCase } from '../../../../Applications/use_case/purchase-orders/SubmitPurchaseOrderUseCase';
import { ApprovePurchaseOrderUseCase } from '../../../../Applications/use_case/purchase-orders/ApprovePurchaseOrderUseCase';
import { RejectPurchaseOrderUseCase } from '../../../../Applications/use_case/purchase-orders/RejectPurchaseOrderUseCase';
import { CancelPurchaseOrderUseCase } from '../../../../Applications/use_case/purchase-orders/CancelPurchaseOrderUseCase';
import { GetPurchaseOrdersUseCase } from '../../../../Applications/use_case/purchase-orders/GetPurchaseOrdersUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';
import { PurchaseOrderActionDto } from './dto/purchase-order-action.dto';

/**
 * PurchaseOrderController — second procurement document module (doc 26).
 * Company-scoped; permission-guarded per doc 26 §11 / doc 16.
 *
 * Permission mapping decisions:
 *   read    → procurement.po.read
 *   create  → procurement.po.create   (POST)
 *   update  → procurement.po.update   (PUT, DRAFT/REJECTED only)
 *   submit  → procurement.po.create   (creator action, part of the raise-and-submit flow)
 *   approve → procurement.po.approve
 *   reject  → procurement.po.approve  (reject is an approver decision)
 *   cancel  → procurement.po.update   (voiding an editable or approved order)
 *
 * Tahap 1 scope: core PO + approval timeline (status logs). Comments and
 * attachments are a separate later stage and intentionally not implemented here.
 *
 * DocumentAuthorizationService (doc 43) does not yet exist in the codebase, so
 * authorization here uses the granular permission guard only; outlet-scope and
 * nominal approval limits are deferred by project decision.
 */
@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(
    private readonly createUseCase: CreatePurchaseOrderUseCase,
    private readonly updateUseCase: UpdatePurchaseOrderUseCase,
    private readonly submitUseCase: SubmitPurchaseOrderUseCase,
    private readonly approveUseCase: ApprovePurchaseOrderUseCase,
    private readonly rejectUseCase: RejectPurchaseOrderUseCase,
    private readonly cancelUseCase: CancelPurchaseOrderUseCase,
    private readonly getUseCase: GetPurchaseOrdersUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.read')
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiResponse({ status: 200, description: 'Paginated purchase order list' })
  async list(@Query() query: PurchaseOrderQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      {
        limit,
        offset,
        status: query.status,
        supplierId: query.supplierId,
        destinationOutletId: query.destinationOutletId,
        purchaseRequestId: query.purchaseRequestId,
        search: query.search,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.read')
  @ApiOperation({ summary: 'Get a purchase order by ID (with items and timeline)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Purchase order detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const po = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(po);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.po.create')
  @ApiOperation({ summary: 'Create a purchase order draft from an APPROVED purchase request' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({ status: 400, description: 'Validation error / PR not approved / supplier inactive' })
  async create(@Body() dto: CreatePurchaseOrderDto, @GetUser() user: JwtAccessPayload) {
    const po = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(po);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.update')
  @ApiOperation({ summary: 'Update a purchase order (DRAFT or REJECTED only)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 400, description: 'Not in editable status' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const po = await this.updateUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(po);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.create')
  @ApiOperation({ summary: 'Submit a purchase order (DRAFT -> SUBMITTED)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Submitted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async submit(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const po = await this.submitUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(po);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.approve')
  @ApiOperation({ summary: 'Approve a purchase order (SUBMITTED -> APPROVED)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Approved' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async approve(
    @Param('id') id: string,
    @Body() dto: PurchaseOrderActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const po = await this.approveUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(po);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.approve')
  @ApiOperation({ summary: 'Reject a purchase order (SUBMITTED -> REJECTED, reason required)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Rejected' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing reason' })
  async reject(
    @Param('id') id: string,
    @Body() dto: PurchaseOrderActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const po = await this.rejectUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(po);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.update')
  @ApiOperation({ summary: 'Cancel a purchase order (DRAFT|REJECTED|APPROVED -> CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: PurchaseOrderActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const po = await this.cancelUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(po);
  }
}
