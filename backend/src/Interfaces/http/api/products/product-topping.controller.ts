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
import { ListProductToppingsUseCase } from '../../../../Applications/use_case/product-toppings/ListProductToppingsUseCase';
import { CreateProductToppingUseCase } from '../../../../Applications/use_case/product-toppings/CreateProductToppingUseCase';
import { UpdateProductToppingUseCase } from '../../../../Applications/use_case/product-toppings/UpdateProductToppingUseCase';
import { DeleteProductToppingUseCase } from '../../../../Applications/use_case/product-toppings/DeleteProductToppingUseCase';
import { ProductTopping } from '../../../../Domains/product-toppings/entities/ProductTopping';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateProductToppingDto } from './dto/create-product-topping.dto';
import { UpdateProductToppingDto } from './dto/update-product-topping.dto';

/**
 * ProductToppingController
 *
 * Per-product allowed-topping master management as a sub-resource of products
 * (doc 51 §5 Opsi C). This is the MANAGEMENT endpoint (guard product.*);
 * distinct from the POS lookup `/sales/pos/products/:id/toppings` (guard
 * sales.manage), which remains untouched.
 *
 * GET    /api/v1/products/:productId/toppings       → list   (product.read)
 * POST   /api/v1/products/:productId/toppings       → create (product.manage)
 * PUT    /api/v1/products/:productId/toppings/:id   → update (product.manage)
 * DELETE /api/v1/products/:productId/toppings/:id   → delete (product.manage)
 */
@ApiTags('Product Toppings')
@ApiBearerAuth()
@Controller('products/:productId/toppings')
export class ProductToppingController {
  constructor(
    private readonly listUseCase: ListProductToppingsUseCase,
    private readonly createUseCase: CreateProductToppingUseCase,
    private readonly updateUseCase: UpdateProductToppingUseCase,
    private readonly deleteUseCase: DeleteProductToppingUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  private _present(topping: ProductTopping) {
    return {
      id: topping.id,
      productId: topping.productId,
      toppingProductId: topping.toppingProductId,
      toppingName: topping.toppingName,
      toppingSku: topping.toppingSku,
      uomId: topping.uomId,
      uomCode: topping.uomCode,
      defaultQtyPerItem: topping.defaultQtyPerItem,
      extraPrice: topping.extraPrice,
      sortOrder: topping.sortOrder,
      isActive: topping.isActive,
      createdAt: topping.createdAt,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'List allowed toppings for a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'List of product toppings' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.read' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async list(@Param('productId') productId: string, @GetUser() user: JwtAccessPayload) {
    const rows = await this.listUseCase.execute(productId, this._companyId(user));
    return successResponse(rows.map((row) => this._present(row)));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Add an allowed topping to a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 201, description: 'Product topping created' })
  @ApiResponse({ status: 400, description: 'Validation error (qty <= 0, extra price < 0, invalid topping type, self-topping)' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.manage' })
  @ApiResponse({ status: 404, description: 'Product or topping product not found' })
  @ApiResponse({ status: 409, description: 'Topping already defined for this product' })
  async create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductToppingDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const topping = await this.createUseCase.execute(productId, dto, this._companyId(user));
    return successResponse(this._present(topping));
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Update a product topping (qty / extra price / sort order / active flag)' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'id', description: 'Product topping UUID' })
  @ApiResponse({ status: 200, description: 'Product topping updated' })
  @ApiResponse({ status: 400, description: 'Validation error (qty <= 0, extra price < 0)' })
  @ApiResponse({ status: 404, description: 'Product or topping not found' })
  async update(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductToppingDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const topping = await this.updateUseCase.execute(productId, id, dto, this._companyId(user));
    return successResponse(this._present(topping));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Delete a product topping' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'id', description: 'Product topping UUID' })
  @ApiResponse({ status: 200, description: 'Product topping deleted' })
  @ApiResponse({ status: 404, description: 'Product or topping not found' })
  async delete(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @GetUser() user: JwtAccessPayload,
  ) {
    await this.deleteUseCase.execute(productId, id, this._companyId(user));
    return successResponse(null);
  }
}
