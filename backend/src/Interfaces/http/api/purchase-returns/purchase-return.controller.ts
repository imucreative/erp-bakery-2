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
import { CreatePurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/CreatePurchaseReturnUseCase';
import { UpdatePurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/UpdatePurchaseReturnUseCase';
import { SubmitPurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/SubmitPurchaseReturnUseCase';
import { CompletePurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/CompletePurchaseReturnUseCase';
import { CancelPurchaseReturnUseCase } from '../../../../Applications/use_case/purchase-returns/CancelPurchaseReturnUseCase';
import { GetPurchaseReturnsUseCase } from '../../../../Applications/use_case/purchase-returns/GetPurchaseReturnsUseCase';
import { GetReturnableUseCase } from '../../../../Applications/use_case/purchase-returns/GetReturnableUseCase';
import { AddPurchaseReturnCommentUseCase } from '../../../../Applications/use_case/purchase-returns/AddPurchaseReturnCommentUseCase';
import { GetPurchaseReturnCommentsUseCase } from '../../../../Applications/use_case/purchase-returns/GetPurchaseReturnCommentsUseCase';
import { UploadPurchaseReturnAttachmentUseCase } from '../../../../Applications/use_case/purchase-returns/UploadPurchaseReturnAttachmentUseCase';
import { ListPurchaseReturnAttachmentsUseCase } from '../../../../Applications/use_case/purchase-returns/ListPurchaseReturnAttachmentsUseCase';
import { GetPurchaseReturnAttachmentUseCase } from '../../../../Applications/use_case/purchase-returns/GetPurchaseReturnAttachmentUseCase';
import { DeletePurchaseReturnAttachmentUseCase } from '../../../../Applications/use_case/purchase-returns/DeletePurchaseReturnAttachmentUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { InvariantError } from '../../../../Commons/exceptions/InvariantError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';
import { PurchaseReturnQueryDto } from './dto/purchase-return-query.dto';
import { ReturnableQueryDto } from './dto/returnable-query.dto';
import { PurchaseReturnActionDto } from './dto/purchase-return-action.dto';
import { AddPurchaseReturnCommentDto } from './dto/add-purchase-return-comment.dto';

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
 *   comments (list + add)      → procurement.return.read
 *   attachments list/download  → procurement.return.read
 *   attachments upload/delete   → procurement.return.update
 *
 * Attachments (doc 35 §5, Stage 2): listing/downloading is
 * `procurement.return.read` (reading the document's evidence). Uploading and
 * deleting are `procurement.return.update` because attaching or removing a file
 * materially changes the document. Only PDF/JPEG/PNG up to 5 MB are accepted;
 * stored file names are derived server-side (never from the client name) and
 * downloads are scoped to the return + company (IDOR/traversal guard). Mirrors
 * the Goods Receipt attachments.
 *
 * Commenting (Stage 2) is guarded by `procurement.return.read` (not
 * create/complete): a comment is a collaboration note on the discussion thread,
 * not a mutation of the document itself. Anyone who may read a return may take
 * part in its thread. Manual comments accept INTERNAL/APPROVAL/EXTERNAL only
 * (default INTERNAL); SYSTEM is backend-only and rejected (400). Mirrors the
 * Goods Receipt thread exactly.
 *
 * On create, reasonDescription is MANDATORY when a line's reason = OTHER
 * (doc 26 §6 #17): validated early at the DTO layer (400 before the use case)
 * and re-validated defensively in the CreatePurchaseReturn domain entity.
 *
 * Company-scope is enforced; outlet-scope and nominal approval limits are
 * deferred by project decision (DocumentAuthorizationService doc 43 does not yet
 * exist), matching the Goods Receipt module.
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
    private readonly addCommentUseCase: AddPurchaseReturnCommentUseCase,
    private readonly getCommentsUseCase: GetPurchaseReturnCommentsUseCase,
    private readonly uploadAttachmentUseCase: UploadPurchaseReturnAttachmentUseCase,
    private readonly listAttachmentsUseCase: ListPurchaseReturnAttachmentsUseCase,
    private readonly getAttachmentUseCase: GetPurchaseReturnAttachmentUseCase,
    private readonly deleteAttachmentUseCase: DeletePurchaseReturnAttachmentUseCase,
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

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('procurement.return.read')
  @ApiOperation({ summary: 'List the discussion thread of a purchase return' })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({ status: 200, description: 'Chronological comment thread' })
  @ApiResponse({ status: 404, description: 'Purchase return not found' })
  async listComments(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const comments = await this.getCommentsUseCase.execute(id, this._companyId(user));
    return successResponse(comments);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.return.read')
  @ApiOperation({
    summary: 'Add a comment to a purchase return thread (default category INTERNAL)',
  })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 400, description: 'Empty body or disallowed category (e.g. SYSTEM)' })
  @ApiResponse({ status: 404, description: 'Purchase return not found' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddPurchaseReturnCommentDto,
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
  @RequirePermission('procurement.return.read')
  @ApiOperation({ summary: 'List attachments of a purchase return' })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
  @ApiResponse({ status: 200, description: 'Attachment metadata list' })
  @ApiResponse({ status: 404, description: 'Purchase return not found' })
  async listAttachments(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const attachments = await this.listAttachmentsUseCase.execute(id, this._companyId(user));
    return successResponse(attachments);
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('procurement.return.update')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an attachment (PDF/JPG/PNG, max 5 MB) to a purchase return',
  })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
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
  @ApiResponse({ status: 404, description: 'Purchase return not found' })
  async uploadAttachment(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @GetUser() user: JwtAccessPayload,
  ) {
    if (typeof request.file !== 'function') {
      throw new InvariantError('UPLOAD_PURCHASE_RETURN_ATTACHMENT.FILE_REQUIRED');
    }

    let part;
    try {
      part = await request.file();
    } catch (err) {
      // @fastify/multipart throws when the file exceeds the configured limit.
      if (
        err &&
        typeof err === 'object' &&
        (err as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE'
      ) {
        throw new InvariantError('UPLOAD_PURCHASE_RETURN_ATTACHMENT.FILE_TOO_LARGE');
      }
      throw err;
    }

    if (!part) {
      throw new InvariantError('UPLOAD_PURCHASE_RETURN_ATTACHMENT.FILE_REQUIRED');
    }

    const buffer = await part.toBuffer();
    // toBuffer() truncates at the limit and flags truncation; reject explicitly.
    if (part.file.truncated) {
      throw new InvariantError('UPLOAD_PURCHASE_RETURN_ATTACHMENT.FILE_TOO_LARGE');
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
  @RequirePermission('procurement.return.read')
  @ApiOperation({ summary: 'Download a purchase return attachment' })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
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
  @RequirePermission('procurement.return.update')
  @ApiOperation({ summary: 'Delete a purchase return attachment (row + file)' })
  @ApiParam({ name: 'id', description: 'Purchase return UUID' })
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
