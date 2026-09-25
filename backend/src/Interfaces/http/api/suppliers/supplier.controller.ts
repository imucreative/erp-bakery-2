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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSupplierUseCase } from '../../../../Applications/use_case/suppliers/CreateSupplierUseCase';
import { UpdateSupplierUseCase } from '../../../../Applications/use_case/suppliers/UpdateSupplierUseCase';
import { DeleteSupplierUseCase } from '../../../../Applications/use_case/suppliers/DeleteSupplierUseCase';
import { SupplierRepository } from '../../../../Domains/suppliers/SupplierRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';

/**
 * SupplierController
 *
 * Tenant-scoped CRUD for suppliers. Requires supplier.read / supplier.manage.
 *
 * POST   /api/v1/suppliers       → create
 * GET    /api/v1/suppliers       → list (paginated, search, isActive)
 * GET    /api/v1/suppliers/:id   → detail
 * PUT    /api/v1/suppliers/:id   → update
 * DELETE /api/v1/suppliers/:id   → soft-delete (blocked when in use → 409)
 */
@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SupplierController {
  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
    private readonly deleteSupplierUseCase: DeleteSupplierUseCase,
    private readonly supplierRepository: SupplierRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('supplier.manage')
  @ApiOperation({ summary: 'Create a new supplier for the current company' })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing supplier.manage' })
  async create(@Body() dto: CreateSupplierDto, @GetUser() user: JwtAccessPayload) {
    const supplier = await this.createSupplierUseCase.execute(dto, this._companyId(user));
    return successResponse(supplier);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('supplier.read')
  @ApiOperation({ summary: 'List suppliers for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated supplier list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing supplier.read' })
  async list(@Query() query: SupplierQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.supplierRepository.getSuppliersByCompany(companyId, {
      limit,
      offset,
      search: query.search,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });

    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('supplier.read')
  @ApiOperation({ summary: 'Get a single supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier data' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const supplier = await this.supplierRepository.getSupplierById(id, this._companyId(user));
    return successResponse(supplier);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('supplier.manage')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot deactivate' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const supplier = await this.updateSupplierUseCase.execute(id, dto, this._companyId(user));
    return successResponse(supplier);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('supplier.manage')
  @ApiOperation({ summary: 'Soft-delete a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier deleted' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot delete' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteSupplierUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
