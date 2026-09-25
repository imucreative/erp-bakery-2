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
import { CreateProductUseCase } from '../../../../Applications/use_case/products/CreateProductUseCase';
import { UpdateProductUseCase } from '../../../../Applications/use_case/products/UpdateProductUseCase';
import { DeleteProductUseCase } from '../../../../Applications/use_case/products/DeleteProductUseCase';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

/**
 * ProductController
 *
 * Tenant-scoped CRUD for products. Requires product.read / product.manage.
 *
 * POST   /api/v1/products       → create (validates group/category/uom/supplier + SKU/barcode uniqueness)
 * GET    /api/v1/products       → list (paginated, search, isActive, productType, group/category/supplier)
 * GET    /api/v1/products/:id   → detail
 * PUT    /api/v1/products/:id   → update
 * DELETE /api/v1/products/:id   → soft-delete
 */
@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly productRepository: ProductRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Create a new product for the current company' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.manage' })
  @ApiResponse({ status: 409, description: 'SKU or barcode already used' })
  async create(@Body() dto: CreateProductDto, @GetUser() user: JwtAccessPayload) {
    const product = await this.createProductUseCase.execute(dto, this._companyId(user));
    return successResponse(product);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'List products for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.read' })
  async list(@Query() query: ProductQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.productRepository.getProductsByCompany(companyId, {
      limit,
      offset,
      search: query.search,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
      productType: query.productType,
      productGroupId: query.productGroupId,
      categoryId: query.categoryId,
      supplierId: query.supplierId,
    });

    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product data' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const product = await this.productRepository.getProductById(id, this._companyId(user));
    return successResponse(product);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Barcode already used' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const product = await this.updateProductUseCase.execute(id, dto, this._companyId(user));
    return successResponse(product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Soft-delete a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteProductUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
