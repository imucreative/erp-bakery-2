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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePaymentTermUseCase } from '../../../../Applications/use_case/payment-terms/CreatePaymentTermUseCase';
import { UpdatePaymentTermUseCase } from '../../../../Applications/use_case/payment-terms/UpdatePaymentTermUseCase';
import { DeletePaymentTermUseCase } from '../../../../Applications/use_case/payment-terms/DeletePaymentTermUseCase';
import { PaymentTermRepository } from '../../../../Domains/payment-terms/PaymentTermRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreatePaymentTermDto } from './dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from './dto/update-payment-term.dto';
import { PaymentTermQueryDto } from './dto/payment-term-query.dto';

/**
 * PaymentTermController
 *
 * Tenant-scoped CRUD for payment terms. Requires payment-term.read / payment-term.manage.
 *
 * POST   /api/v1/payment-terms         → create
 * GET    /api/v1/payment-terms         → list (paginated, search, isActive)
 * GET    /api/v1/payment-terms/lookup  → active-only list for dropdowns
 * GET    /api/v1/payment-terms/:id     → detail
 * PUT    /api/v1/payment-terms/:id     → update (code immutable)
 * DELETE /api/v1/payment-terms/:id     → soft-delete (blocked when in use → 409)
 */
@ApiTags('Payment Terms')
@ApiBearerAuth()
@Controller('payment-terms')
export class PaymentTermController {
  constructor(
    private readonly createPaymentTermUseCase: CreatePaymentTermUseCase,
    private readonly updatePaymentTermUseCase: UpdatePaymentTermUseCase,
    private readonly deletePaymentTermUseCase: DeletePaymentTermUseCase,
    private readonly paymentTermRepository: PaymentTermRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('payment-term.manage')
  @ApiOperation({ summary: 'Create a new payment term for the current company' })
  @ApiResponse({ status: 201, description: 'Payment term created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing payment-term.manage' })
  @ApiResponse({ status: 409, description: 'Code already used' })
  async create(@Body() dto: CreatePaymentTermDto, @GetUser() user: JwtAccessPayload) {
    const paymentTerm = await this.createPaymentTermUseCase.execute(dto, this._companyId(user));
    return successResponse(paymentTerm);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('payment-term.read')
  @ApiOperation({ summary: 'List payment terms for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated payment term list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing payment-term.read' })
  async list(@Query() query: PaymentTermQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.paymentTermRepository.getPaymentTermsByCompany(companyId, {
      limit,
      offset,
      search: query.search,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });

    return listResponse(rows, total, page, limit);
  }

  @Get('lookup')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('payment-term.read')
  @ApiOperation({ summary: 'List active payment terms (for dropdowns)' })
  @ApiResponse({ status: 200, description: 'Active payment terms' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing payment-term.read' })
  async lookup(@GetUser() user: JwtAccessPayload) {
    const rows = await this.paymentTermRepository.getActivePaymentTerms(this._companyId(user));
    return successResponse(rows);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('payment-term.read')
  @ApiOperation({ summary: 'Get a single payment term by ID' })
  @ApiParam({ name: 'id', description: 'Payment term UUID' })
  @ApiResponse({ status: 200, description: 'Payment term data' })
  @ApiResponse({ status: 404, description: 'Payment term not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const paymentTerm = await this.paymentTermRepository.getPaymentTermById(
      id,
      this._companyId(user),
    );
    return successResponse(paymentTerm);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('payment-term.manage')
  @ApiOperation({ summary: 'Update a payment term (code is immutable)' })
  @ApiParam({ name: 'id', description: 'Payment term UUID' })
  @ApiResponse({ status: 200, description: 'Payment term updated' })
  @ApiResponse({ status: 404, description: 'Payment term not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot deactivate' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTermDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const paymentTerm = await this.updatePaymentTermUseCase.execute(id, dto, this._companyId(user));
    return successResponse(paymentTerm);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('payment-term.manage')
  @ApiOperation({ summary: 'Soft-delete a payment term' })
  @ApiParam({ name: 'id', description: 'Payment term UUID' })
  @ApiResponse({ status: 200, description: 'Payment term deleted' })
  @ApiResponse({ status: 404, description: 'Payment term not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot delete' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deletePaymentTermUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
