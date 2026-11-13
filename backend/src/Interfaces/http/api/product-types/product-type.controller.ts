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
import { ProductTypeRepository } from '../../../../Domains/product-types/ProductTypeRepository';
import { CreateProductTypeUseCase } from '../../../../Applications/use_case/product-types/CreateProductTypeUseCase';
import { UpdateProductTypeUseCase } from '../../../../Applications/use_case/product-types/UpdateProductTypeUseCase';
import { DeleteProductTypeUseCase } from '../../../../Applications/use_case/product-types/DeleteProductTypeUseCase';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductTypeQueryDto } from './dto/product-type-query.dto';

/**
 * ProductTypeController
 *
 * Global product-type reference data. Product forms use the active list; the
 * master-data page requests `includeInactive=true` to manage retired types.
 *
 * GET    /api/v1/product-types               → active list (or all)
 * GET    /api/v1/product-types/:code         → detail
 * POST   /api/v1/product-types               → create
 * PUT    /api/v1/product-types/:code         → update (code immutable)
 * DELETE /api/v1/product-types/:code         → hard-delete (409 when in use)
 */
@ApiTags('Product Types')
@ApiBearerAuth()
@Controller('product-types')
export class ProductTypeController {
  constructor(
    private readonly createProductTypeUseCase: CreateProductTypeUseCase,
    private readonly updateProductTypeUseCase: UpdateProductTypeUseCase,
    private readonly deleteProductTypeUseCase: DeleteProductTypeUseCase,
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'List product types' })
  @ApiResponse({ status: 200, description: 'Product types ordered for display' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.read' })
  async list(@Query() query: ProductTypeQueryDto) {
    const productTypes =
      query.includeInactive === 'true'
        ? await this.productTypeRepository.listAll()
        : await this.productTypeRepository.listActive();
    return successResponse(productTypes);
  }

  @Get(':code')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'Get one product type by code' })
  @ApiParam({ name: 'code', description: 'Product type code' })
  @ApiResponse({ status: 200, description: 'Product type data' })
  @ApiResponse({ status: 404, description: 'Product type not found' })
  async getByCode(@Param('code') code: string) {
    const productType = await this.productTypeRepository.getByCode(code);
    return successResponse(productType);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Create a product type' })
  @ApiResponse({ status: 201, description: 'Product type created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Code already used' })
  async create(@Body() dto: CreateProductTypeDto) {
    const productType = await this.createProductTypeUseCase.execute(dto);
    return successResponse(productType);
  }

  @Put(':code')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Update a product type (code is immutable)' })
  @ApiParam({ name: 'code', description: 'Product type code' })
  @ApiResponse({ status: 200, description: 'Product type updated' })
  @ApiResponse({ status: 404, description: 'Product type not found' })
  async update(@Param('code') code: string, @Body() dto: UpdateProductTypeDto) {
    const productType = await this.updateProductTypeUseCase.execute(code, dto);
    return successResponse(productType);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Delete a product type' })
  @ApiParam({ name: 'code', description: 'Product type code' })
  @ApiResponse({ status: 200, description: 'Product type deleted' })
  @ApiResponse({ status: 404, description: 'Product type not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot delete; deactivate instead' })
  async delete(@Param('code') code: string) {
    await this.deleteProductTypeUseCase.execute(code);
    return successResponse(null);
  }
}
