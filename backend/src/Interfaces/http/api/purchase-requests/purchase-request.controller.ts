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
import { CreatePurchaseRequestUseCase } from '../../../../Applications/use_case/purchase-requests/CreatePurchaseRequestUseCase';
import { UpdatePurchaseRequestUseCase } from '../../../../Applications/use_case/purchase-requests/UpdatePurchaseRequestUseCase';
import { SubmitPurchaseRequestUseCase } from '../../../../Applications/use_case/purchase-requests/SubmitPurchaseRequestUseCase';
import { ApprovePurchaseRequestUseCase } from '../../../../Applications/use_case/purchase-requests/ApprovePurchaseRequestUseCase';
import { RejectPurchaseRequestUseCase } from '../../../../Applications/use_case/purchase-requests/RejectPurchaseRequestUseCase';
import { CancelPurchaseRequestUseCase } from '../../../../Applications/use_case/purchase-requests/CancelPurchaseRequestUseCase';
import { GetPurchaseRequestsUseCase } from '../../../../Applications/use_case/purchase-requests/GetPurchaseRequestsUseCase';
import { AddPurchaseRequestCommentUseCase } from '../../../../Applications/use_case/purchase-requests/AddPurchaseRequestCommentUseCase';
import { GetPurchaseRequestCommentsUseCase } from '../../../../Applications/use_case/purchase-requests/GetPurchaseRequestCommentsUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { PurchaseRequestQueryDto } from './dto/purchase-request-query.dto';
import { PurchaseRequestActionDto } from './dto/purchase-request-action.dto';
import { AddPurchaseRequestCommentDto } from './dto/add-purchase-request-comment.dto';

/**
 * PurchaseRequestController — first procurement document module (doc 34).
 * Company-scoped; permission-guarded per doc 34 §5 / doc 16.
 *
 * Permission mapping decisions:
 *   read    → procurement.pr.read
 *   create  → procurement.pr.create   (POST)
 *   update  → procurement.pr.update   (PUT, DRAFT/REJECTED only)
 *   submit  → procurement.pr.create   (creator action, part of the raise-and-submit flow)
 *   approve → procurement.pr.approve
 *   reject  → procurement.pr.approve  (reject is an approver decision)
 *   cancel  → procurement.pr.update   (creator voiding their own editable document)
 *   comments (list + add) → procurement.pr.read
 *
 * Commenting is guarded by `procurement.pr.read` (not create/update): a comment
 * is a collaboration note on the discussion thread, not a mutation of the
 * document itself. Anyone who may read a PR — creators, approvers — may take
 * part in its thread. Manual comments accept INTERNAL/APPROVAL/EXTERNAL only
 * (default INTERNAL); SYSTEM is backend-only and rejected (400).
 *
 * DocumentAuthorizationService (doc 43) does not yet exist in the codebase, so
 * authorization here uses the granular permission guard only. Ownership/outlet
 * scoping will be layered in when that service lands.
 */
@ApiTags('Purchase Requests')
@ApiBearerAuth()
@Controller('purchase-requests')
export class PurchaseRequestController {
  constructor(
    private readonly createUseCase: CreatePurchaseRequestUseCase,
    private readonly updateUseCase: UpdatePurchaseRequestUseCase,
    private readonly submitUseCase: SubmitPurchaseRequestUseCase,
    private readonly approveUseCase: ApprovePurchaseRequestUseCase,
    private readonly rejectUseCase: RejectPurchaseRequestUseCase,
    private readonly cancelUseCase: CancelPurchaseRequestUseCase,
    private readonly getUseCase: GetPurchaseRequestsUseCase,
    private readonly addCommentUseCase: AddPurchaseRequestCommentUseCase,
    private readonly getCommentsUseCase: GetPurchaseRequestCommentsUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.read')
  @ApiOperation({ summary: 'List purchase requests' })
  @ApiResponse({ status: 200, description: 'Paginated purchase request list' })
  async list(@Query() query: PurchaseRequestQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      {
        limit,
        offset,
        status: query.status,
        destinationOutletId: query.destinationOutletId,
        search: query.search,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.read')
  @ApiOperation({ summary: 'Get a purchase request by ID (with items and timeline)' })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 200, description: 'Purchase request detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const pr = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(pr);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.pr.create')
  @ApiOperation({ summary: 'Create a purchase request draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreatePurchaseRequestDto, @GetUser() user: JwtAccessPayload) {
    const pr = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(pr);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.update')
  @ApiOperation({ summary: 'Update a purchase request (DRAFT or REJECTED only)' })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 400, description: 'Not in editable status' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const pr = await this.updateUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(pr);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.create')
  @ApiOperation({ summary: 'Submit a purchase request (DRAFT -> SUBMITTED)' })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 200, description: 'Submitted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async submit(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const pr = await this.submitUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(pr);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.approve')
  @ApiOperation({ summary: 'Approve a purchase request (SUBMITTED -> APPROVED)' })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 200, description: 'Approved' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async approve(
    @Param('id') id: string,
    @Body() dto: PurchaseRequestActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const pr = await this.approveUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(pr);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.approve')
  @ApiOperation({ summary: 'Reject a purchase request (SUBMITTED -> REJECTED, reason required)' })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 200, description: 'Rejected' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing reason' })
  async reject(
    @Param('id') id: string,
    @Body() dto: PurchaseRequestActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const pr = await this.rejectUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(pr);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.update')
  @ApiOperation({ summary: 'Cancel a purchase request (DRAFT|REJECTED -> CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: PurchaseRequestActionDto,
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

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.pr.read')
  @ApiOperation({ summary: 'List the discussion thread of a purchase request' })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 200, description: 'Chronological comment thread' })
  @ApiResponse({ status: 404, description: 'Purchase request not found' })
  async listComments(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const comments = await this.getCommentsUseCase.execute(id, this._companyId(user));
    return successResponse(comments);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.pr.read')
  @ApiOperation({
    summary: 'Add a comment to a purchase request thread (default category INTERNAL)',
  })
  @ApiParam({ name: 'id', description: 'Purchase request UUID' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 400, description: 'Empty body or disallowed category (e.g. SYSTEM)' })
  @ApiResponse({ status: 404, description: 'Purchase request not found' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddPurchaseRequestCommentDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const comment = await this.addCommentUseCase.execute(
      id,
      dto,
      this._companyId(user),
      user.sub,
    );
    return successResponse(comment);
  }
}
