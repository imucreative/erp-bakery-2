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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ListProductUomConversionsUseCase } from '../../../../Applications/use_case/product-uom-conversions/ListProductUomConversionsUseCase';
import { CreateProductUomConversionUseCase } from '../../../../Applications/use_case/product-uom-conversions/CreateProductUomConversionUseCase';
import { UpdateProductUomConversionUseCase } from '../../../../Applications/use_case/product-uom-conversions/UpdateProductUomConversionUseCase';
import { DeleteProductUomConversionUseCase } from '../../../../Applications/use_case/product-uom-conversions/DeleteProductUomConversionUseCase';
import { ProductUomConversion } from '../../../../Domains/product-uom-conversions/entities/ProductUomConversion';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateProductUomConversionDto } from './dto/create-product-uom-conversion.dto';
import { UpdateProductUomConversionDto } from './dto/update-product-uom-conversion.dto';

/**
 * ProductUomConversionController
 *
 * Per-product UOM conversions as a sub-resource of products (model per-produk,
 * doc 50). Master data only — ADITIF & OPT-IN: no GR/inventory/recipe/production
 * path consumes these rows in TAHAP 1.
 *
 * GET    /api/v1/products/:productId/uom-conversions       → list   (product.read)
 * POST   /api/v1/products/:productId/uom-conversions       → create (product.manage)
 * PUT    /api/v1/products/:productId/uom-conversions/:id   → update (product.manage)
 * DELETE /api/v1/products/:productId/uom-conversions/:id   → delete (product.manage)
 */
@ApiTags('Product UOM Conversions')
@ApiBearerAuth()
@Controller('products/:productId/uom-conversions')
export class ProductUomConversionController {
  constructor(
    private readonly listUseCase: ListProductUomConversionsUseCase,
    private readonly createUseCase: CreateProductUomConversionUseCase,
    private readonly updateUseCase: UpdateProductUomConversionUseCase,
    private readonly deleteUseCase: DeleteProductUomConversionUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  private _present(conversion: ProductUomConversion) {
    return {
      id: conversion.id,
      productId: conversion.productId,
      uomId: conversion.uomId,
      uomCode: conversion.uomCode,
      uomName: conversion.uomName,
      factorToBase: conversion.factorToBase,
      isActive: conversion.isActive,
      createdAt: conversion.createdAt,
      updatedAt: conversion.updatedAt,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'List UOM conversions for a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'List of UOM conversions' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.read' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async list(@Param('productId') productId: string, @GetUser() user: JwtAccessPayload) {
    const rows = await this.listUseCase.execute(productId, this._companyId(user));
    return successResponse(rows.map((row) => this._present(row)));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Create a UOM conversion for a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'UOM conversion created' })
  @ApiResponse({ status: 400, description: 'Validation error (factor <= 0 or uom = base unit)' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.manage' })
  @ApiResponse({ status: 404, description: 'Product or UOM not found' })
  @ApiResponse({ status: 409, description: 'Conversion already defined for this product + UOM' })
  async create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductUomConversionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const conversion = await this.createUseCase.execute(productId, dto, this._companyId(user));
    return successResponse(this._present(conversion));
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Update a UOM conversion (factor / active flag)' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'id', description: 'Conversion UUID' })
  @ApiResponse({ status: 200, description: 'UOM conversion updated' })
  @ApiResponse({ status: 400, description: 'Validation error (factor <= 0)' })
  @ApiResponse({ status: 404, description: 'Product or conversion not found' })
  async update(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductUomConversionDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const conversion = await this.updateUseCase.execute(productId, id, dto, this._companyId(user));
    return successResponse(this._present(conversion));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Delete a UOM conversion' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'id', description: 'Conversion UUID' })
  @ApiResponse({ status: 200, description: 'UOM conversion deleted' })
  @ApiResponse({ status: 404, description: 'Product or conversion not found' })
  async delete(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @GetUser() user: JwtAccessPayload,
  ) {
    await this.deleteUseCase.execute(productId, id, this._companyId(user));
    return successResponse(null);
  }
}
