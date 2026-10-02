import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { GetPurchaseOrderOutstandingUseCase } from '../../../../Applications/use_case/purchase-orders/GetPurchaseOrderOutstandingUseCase';
import { AddPurchaseOrderCommentUseCase } from '../../../../Applications/use_case/purchase-orders/AddPurchaseOrderCommentUseCase';
import { GetPurchaseOrderCommentsUseCase } from '../../../../Applications/use_case/purchase-orders/GetPurchaseOrderCommentsUseCase';
import { UploadPurchaseOrderAttachmentUseCase } from '../../../../Applications/use_case/purchase-orders/UploadPurchaseOrderAttachmentUseCase';
import { ListPurchaseOrderAttachmentsUseCase } from '../../../../Applications/use_case/purchase-orders/ListPurchaseOrderAttachmentsUseCase';
import { GetPurchaseOrderAttachmentUseCase } from '../../../../Applications/use_case/purchase-orders/GetPurchaseOrderAttachmentUseCase';
import { DeletePurchaseOrderAttachmentUseCase } from '../../../../Applications/use_case/purchase-orders/DeletePurchaseOrderAttachmentUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { InvariantError } from '../../../../Commons/exceptions/InvariantError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';
import { PurchaseOrderActionDto } from './dto/purchase-order-action.dto';
import { AddPurchaseOrderCommentDto } from './dto/add-purchase-order-comment.dto';
import { PurchaseOrderOutstandingQueryDto } from './dto/purchase-order-outstanding-query.dto';

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
 *   comments (list + add) → procurement.po.read
 *   attachments list/download → procurement.po.read
 *   attachments upload/delete → procurement.po.update
 *
 * Scope: core PO + approval timeline (status logs) + discussion thread
 * (comments) + attachments (doc 35 §5).
 *
 * Attachments (doc 35 §5): listing/downloading is `procurement.po.read` (reading
 * the document's evidence). Uploading and deleting are `procurement.po.update`
 * because attaching or removing a file materially changes the document's
 * supporting evidence — it is a mutation of the PO, unlike a discussion note.
 * Only PDF/JPEG/PNG up to 5 MB are accepted; stored file names are derived
 * server-side (never from the client name) and downloads are scoped to the PO +
 * company (IDOR/traversal guard). Mirrors the Purchase Request attachments.
 *
 * Commenting is guarded by `procurement.po.read` (not create/update): a comment
 * is a collaboration note on the discussion thread, not a mutation of the
 * document itself. Anyone who may read a PO — creators, approvers — may take
 * part in its thread. Manual comments accept INTERNAL/APPROVAL/EXTERNAL only
 * (default INTERNAL); SYSTEM is backend-only and rejected (400). Mirrors the
 * Purchase Request thread exactly.
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
    private readonly getOutstandingUseCase: GetPurchaseOrderOutstandingUseCase,
    private readonly addCommentUseCase: AddPurchaseOrderCommentUseCase,
    private readonly getCommentsUseCase: GetPurchaseOrderCommentsUseCase,
    private readonly uploadAttachmentUseCase: UploadPurchaseOrderAttachmentUseCase,
    private readonly listAttachmentsUseCase: ListPurchaseOrderAttachmentsUseCase,
    private readonly getAttachmentUseCase: GetPurchaseOrderAttachmentUseCase,
    private readonly deleteAttachmentUseCase: DeletePurchaseOrderAttachmentUseCase,
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
  @ApiOperation({
    summary:
      'List purchase orders. Pass receivable=true to get only APPROVED POs ' +
      'with remaining receivable quantity (source picker for a new GR).',
  })
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
        receivable: query.receivable === 'true',
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get('outstanding')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.create')
  @ApiOperation({
    summary:
      'Outstanding (remaining orderable) quantity per source PR line for a new/edited PO',
  })
  @ApiResponse({
    status: 200,
    description:
      'Per-PR-line outstanding = PR qty minus qty consumed by active sibling POs',
  })
  @ApiResponse({ status: 404, description: 'Source purchase request not found' })
  async outstanding(
    @Query() query: PurchaseOrderOutstandingQueryDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const result = await this.getOutstandingUseCase.execute(
      query.purchaseRequestId,
      this._companyId(user),
      query.excludePurchaseOrderId,
    );
    return successResponse(result);
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

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.read')
  @ApiOperation({ summary: 'List the discussion thread of a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Chronological comment thread' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async listComments(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const comments = await this.getCommentsUseCase.execute(id, this._companyId(user));
    return successResponse(comments);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.po.read')
  @ApiOperation({
    summary: 'Add a comment to a purchase order thread (default category INTERNAL)',
  })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 400, description: 'Empty body or disallowed category (e.g. SYSTEM)' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddPurchaseOrderCommentDto,
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

  @Get(':id/attachments')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.read')
  @ApiOperation({ summary: 'List attachments of a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({ status: 200, description: 'Attachment metadata list' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async listAttachments(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const attachments = await this.listAttachmentsUseCase.execute(id, this._companyId(user));
    return successResponse(attachments);
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.po.update')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an attachment (PDF/JPG/PNG, max 5 MB) to a purchase order',
  })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF/JPG/PNG, max 5 MB' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Attachment stored (metadata returned)' })
  @ApiResponse({ status: 400, description: 'Missing/invalid file, disallowed type, or too large' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async uploadAttachment(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @GetUser() user: JwtAccessPayload,
  ) {
    if (typeof request.file !== 'function') {
      throw new InvariantError('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_REQUIRED');
    }

    let part;
    try {
      part = await request.file();
    } catch (err) {
      // @fastify/multipart throws when the file exceeds the configured limit.
      if (err && typeof err === 'object' && (err as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new InvariantError('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_TOO_LARGE');
      }
      throw err;
    }

    if (!part) {
      throw new InvariantError('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_REQUIRED');
    }

    const buffer = await part.toBuffer();
    // toBuffer() truncates at the limit and flags truncation; reject explicitly.
    if (part.file.truncated) {
      throw new InvariantError('UPLOAD_PURCHASE_ORDER_ATTACHMENT.FILE_TOO_LARGE');
    }

    const attachment = await this.uploadAttachmentUseCase.execute(
      id,
      { originalName: part.filename, mimeType: part.mimetype, buffer },
      this._companyId(user),
      user.sub,
    );
    return successResponse(attachment);
  }

  @Get(':id/attachments/:attId/download')
  @RequirePermission('procurement.po.read')
  @ApiOperation({ summary: 'Download a purchase order attachment' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiParam({ name: 'attId', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attId') attId: string,
    @GetUser() user: JwtAccessPayload,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { attachment, stream } = await this.getAttachmentUseCase.execute(
      id,
      attId,
      this._companyId(user),
    );

    // Content-Disposition filename is quoted and stripped of quotes/newlines to
    // avoid header injection; the original name is preserved for the user.
    const safeName = attachment.originalName.replace(/["\r\n]/g, '');
    reply
      .header('Content-Type', attachment.mimeType)
      .header('Content-Disposition', `attachment; filename="${safeName}"`)
      .header('Content-Length', String(attachment.sizeBytes));
    await reply.send(stream);
  }

  @Delete(':id/attachments/:attId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.po.update')
  @ApiOperation({ summary: 'Delete a purchase order attachment (row + file)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiParam({ name: 'attId', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async deleteAttachment(
    @Param('id') id: string,
    @Param('attId') attId: string,
    @GetUser() user: JwtAccessPayload,
  ) {
    await this.deleteAttachmentUseCase.execute(id, attId, this._companyId(user));
    return successResponse({ id: attId, deleted: true });
  }
}
