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
import { CreateProductGroupUseCase } from '../../../../Applications/use_case/product-groups/CreateProductGroupUseCase';
import { UpdateProductGroupUseCase } from '../../../../Applications/use_case/product-groups/UpdateProductGroupUseCase';
import { DeleteProductGroupUseCase } from '../../../../Applications/use_case/product-groups/DeleteProductGroupUseCase';
import { ProductGroupRepository } from '../../../../Domains/product-groups/ProductGroupRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateProductGroupDto } from './dto/create-product-group.dto';
import { UpdateProductGroupDto } from './dto/update-product-group.dto';
import { ProductGroupQueryDto } from './dto/product-group-query.dto';

/**
 * ProductGroupController
 *
 * Tenant-scoped CRUD for product groups. Requires product-group.read / .manage.
 *
 * POST   /api/v1/product-groups       → create
 * GET    /api/v1/product-groups       → list (paginated, search, isActive)
 * GET    /api/v1/product-groups/:id   → detail
 * PUT    /api/v1/product-groups/:id   → update
 * DELETE /api/v1/product-groups/:id   → soft-delete (blocked when in use → 409)
 */
@ApiTags('Product Groups')
@ApiBearerAuth()
@Controller('product-groups')
export class ProductGroupController {
  constructor(
    private readonly createProductGroupUseCase: CreateProductGroupUseCase,
    private readonly updateProductGroupUseCase: UpdateProductGroupUseCase,
    private readonly deleteProductGroupUseCase: DeleteProductGroupUseCase,
    private readonly productGroupRepository: ProductGroupRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('product-group.manage')
  @ApiOperation({ summary: 'Create a new product group for the current company' })
  @ApiResponse({ status: 201, description: 'Product group created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product-group.manage' })
  async create(@Body() dto: CreateProductGroupDto, @GetUser() user: JwtAccessPayload) {
    const group = await this.createProductGroupUseCase.execute(dto, this._companyId(user));
    return successResponse(group);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product-group.read')
  @ApiOperation({ summary: 'List product groups for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated product group list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product-group.read' })
  async list(@Query() query: ProductGroupQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.productGroupRepository.getProductGroupsByCompany(
      companyId,
      {
        limit,
        offset,
        search: query.search,
        isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
      },
    );

    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product-group.read')
  @ApiOperation({ summary: 'Get a single product group by ID' })
  @ApiParam({ name: 'id', description: 'Product group UUID' })
  @ApiResponse({ status: 200, description: 'Product group data' })
  @ApiResponse({ status: 404, description: 'Product group not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const group = await this.productGroupRepository.getProductGroupById(
      id,
      this._companyId(user),
    );
    return successResponse(group);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product-group.manage')
  @ApiOperation({ summary: 'Update a product group' })
  @ApiParam({ name: 'id', description: 'Product group UUID' })
  @ApiResponse({ status: 200, description: 'Product group updated' })
  @ApiResponse({ status: 404, description: 'Product group not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot deactivate' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductGroupDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const group = await this.updateProductGroupUseCase.execute(
      id,
      dto,
      this._companyId(user),
    );
    return successResponse(group);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product-group.manage')
  @ApiOperation({ summary: 'Soft-delete a product group' })
  @ApiParam({ name: 'id', description: 'Product group UUID' })
  @ApiResponse({ status: 200, description: 'Product group deleted' })
  @ApiResponse({ status: 404, description: 'Product group not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot delete' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteProductGroupUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
