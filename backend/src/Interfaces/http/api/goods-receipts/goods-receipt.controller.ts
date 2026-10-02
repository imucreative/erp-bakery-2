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
import { CreateGoodsReceiptUseCase } from '../../../../Applications/use_case/goods-receipts/CreateGoodsReceiptUseCase';
import { UpdateGoodsReceiptUseCase } from '../../../../Applications/use_case/goods-receipts/UpdateGoodsReceiptUseCase';
import { CancelGoodsReceiptUseCase } from '../../../../Applications/use_case/goods-receipts/CancelGoodsReceiptUseCase';
import { CompleteGoodsReceiptUseCase } from '../../../../Applications/use_case/goods-receipts/CompleteGoodsReceiptUseCase';
import { GetGoodsReceiptsUseCase } from '../../../../Applications/use_case/goods-receipts/GetGoodsReceiptsUseCase';
import { GetGoodsReceiptOutstandingUseCase } from '../../../../Applications/use_case/goods-receipts/GetGoodsReceiptOutstandingUseCase';
import { AddGoodsReceiptCommentUseCase } from '../../../../Applications/use_case/goods-receipts/AddGoodsReceiptCommentUseCase';
import { GetGoodsReceiptCommentsUseCase } from '../../../../Applications/use_case/goods-receipts/GetGoodsReceiptCommentsUseCase';
import { UploadGoodsReceiptAttachmentUseCase } from '../../../../Applications/use_case/goods-receipts/UploadGoodsReceiptAttachmentUseCase';
import { ListGoodsReceiptAttachmentsUseCase } from '../../../../Applications/use_case/goods-receipts/ListGoodsReceiptAttachmentsUseCase';
import { GetGoodsReceiptAttachmentUseCase } from '../../../../Applications/use_case/goods-receipts/GetGoodsReceiptAttachmentUseCase';
import { DeleteGoodsReceiptAttachmentUseCase } from '../../../../Applications/use_case/goods-receipts/DeleteGoodsReceiptAttachmentUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { InvariantError } from '../../../../Commons/exceptions/InvariantError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { GoodsReceiptQueryDto } from './dto/goods-receipt-query.dto';
import { GoodsReceiptActionDto } from './dto/goods-receipt-action.dto';
import { GoodsReceiptOutstandingQueryDto } from './dto/goods-receipt-outstanding-query.dto';
import { AddGoodsReceiptCommentDto } from './dto/add-goods-receipt-comment.dto';

/**
 * GoodsReceiptController — third procurement document module (doc 26).
 * Company-scoped; permission-guarded per doc 26 §11 / doc 16.
 *
 * Scope: core document + approval timeline (status logs) + the complete action
 * (DRAFT -> COMPLETED), which posts ACCEPTED quantities into inventory
 * atomically (Stage 2). Comments & attachments are later stages.
 *
 * Permission mapping decisions (doc 26 §11):
 *   read               → procurement.gr.read
 *   create             → procurement.gr.create   (POST)
 *   update             → procurement.gr.update    (PUT, DRAFT only)
 *   cancel             → procurement.gr.update    (voiding a draft)
 *   outstanding lookup → procurement.gr.create    (used while opening the receive form)
 *   complete           → procurement.gr.complete  (DRAFT -> COMPLETED, posts inventory)
 *   comments (list + add) → procurement.gr.read
 *   attachments list/download → procurement.gr.read
 *   attachments upload/delete → procurement.gr.update
 *
 * Attachments (doc 35 §5): listing/downloading is `procurement.gr.read` (reading
 * the document's evidence). Uploading and deleting are `procurement.gr.update`
 * because attaching or removing a file materially changes the document.
 * Only PDF/JPEG/PNG up to 5 MB are accepted; stored file names are derived
 * server-side (never from the client name) and downloads are scoped to the GR +
 * company (IDOR/traversal guard). Mirrors the Purchase Order attachments.
 *
 * Commenting is guarded by `procurement.gr.read` (not create/complete): a
 * comment is a collaboration note on the discussion thread, not a mutation of
 * the document itself. Anyone who may read a GR may take part in its thread.
 * Manual comments accept INTERNAL/APPROVAL/EXTERNAL only (default INTERNAL);
 * SYSTEM is backend-only and rejected (400). Mirrors the Purchase Order thread
 * exactly.
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
    private readonly completeUseCase: CompleteGoodsReceiptUseCase,
    private readonly getUseCase: GetGoodsReceiptsUseCase,
    private readonly getOutstandingUseCase: GetGoodsReceiptOutstandingUseCase,
    private readonly addCommentUseCase: AddGoodsReceiptCommentUseCase,
    private readonly getCommentsUseCase: GetGoodsReceiptCommentsUseCase,
    private readonly uploadAttachmentUseCase: UploadGoodsReceiptAttachmentUseCase,
    private readonly listAttachmentsUseCase: ListGoodsReceiptAttachmentsUseCase,
    private readonly getAttachmentUseCase: GetGoodsReceiptAttachmentUseCase,
    private readonly deleteAttachmentUseCase: DeleteGoodsReceiptAttachmentUseCase,
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
  @ApiOperation({ summary: 'Cancel a goods receipt (DRAFT -> CANCELLED, stays visible)' })
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

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.gr.complete')
  @ApiOperation({
    summary:
      'Complete a goods receipt (DRAFT -> COMPLETED); posts ACCEPTED quantities to inventory',
  })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
  @ApiResponse({
    status: 200,
    description:
      'Completed; accepted lines posted as PURCHASE inventory movements (idempotent if already completed)',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition (only a DRAFT can complete)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async complete(
    @Param('id') id: string,
    @Body() dto: GoodsReceiptActionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const gr = await this.completeUseCase.execute(
      id,
      this._companyId(user),
      user.sub,
      dto.note ?? null,
    );
    return successResponse(gr);
  }

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.gr.read')
  @ApiOperation({ summary: 'List the discussion thread of a goods receipt' })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
  @ApiResponse({ status: 200, description: 'Chronological comment thread' })
  @ApiResponse({ status: 404, description: 'Goods receipt not found' })
  async listComments(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const comments = await this.getCommentsUseCase.execute(id, this._companyId(user));
    return successResponse(comments);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.gr.read')
  @ApiOperation({
    summary: 'Add a comment to a goods receipt thread (default category INTERNAL)',
  })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 400, description: 'Empty body or disallowed category (e.g. SYSTEM)' })
  @ApiResponse({ status: 404, description: 'Goods receipt not found' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddGoodsReceiptCommentDto,
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
  @RequirePermission('procurement.gr.read')
  @ApiOperation({ summary: 'List attachments of a goods receipt' })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
  @ApiResponse({ status: 200, description: 'Attachment metadata list' })
  @ApiResponse({ status: 404, description: 'Goods receipt not found' })
  async listAttachments(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const attachments = await this.listAttachmentsUseCase.execute(id, this._companyId(user));
    return successResponse(attachments);
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.gr.update')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an attachment (PDF/JPG/PNG, max 5 MB) to a goods receipt',
  })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
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
  @ApiResponse({ status: 404, description: 'Goods receipt not found' })
  async uploadAttachment(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @GetUser() user: JwtAccessPayload,
  ) {
    if (typeof request.file !== 'function') {
      throw new InvariantError('UPLOAD_GOODS_RECEIPT_ATTACHMENT.FILE_REQUIRED');
    }

    let part;
    try {
      part = await request.file();
    } catch (err) {
      // @fastify/multipart throws when the file exceeds the configured limit.
      if (err && typeof err === 'object' && (err as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new InvariantError('UPLOAD_GOODS_RECEIPT_ATTACHMENT.FILE_TOO_LARGE');
      }
      throw err;
    }

    if (!part) {
      throw new InvariantError('UPLOAD_GOODS_RECEIPT_ATTACHMENT.FILE_REQUIRED');
    }

    const buffer = await part.toBuffer();
    // toBuffer() truncates at the limit and flags truncation; reject explicitly.
    if (part.file.truncated) {
      throw new InvariantError('UPLOAD_GOODS_RECEIPT_ATTACHMENT.FILE_TOO_LARGE');
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
  @RequirePermission('procurement.gr.read')
  @ApiOperation({ summary: 'Download a goods receipt attachment' })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
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
  @RequirePermission('procurement.gr.update')
  @ApiOperation({ summary: 'Delete a goods receipt attachment (row + file)' })
  @ApiParam({ name: 'id', description: 'Goods receipt UUID' })
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
