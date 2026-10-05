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
import { GetToppingsUseCase } from '../../../../Applications/use_case/toppings/GetToppingsUseCase';
import { CreateToppingUseCase } from '../../../../Applications/use_case/toppings/CreateToppingUseCase';
import { UpdateToppingUseCase } from '../../../../Applications/use_case/toppings/UpdateToppingUseCase';
import { DeleteToppingUseCase } from '../../../../Applications/use_case/toppings/DeleteToppingUseCase';
import { Topping } from '../../../../Domains/toppings/entities/Topping';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateToppingDto } from './dto/create-topping.dto';
import { UpdateToppingDto } from './dto/update-topping.dto';

/**
 * ToppingController — GLOBAL topping catalog master management (doc 51 §5.0/§10).
 *
 * One catalog per company; a topping product appears at most once. This is the
 * MANAGEMENT (admin) endpoint; the POS modifier panel reads the active catalog
 * via GET /sales/pos/toppings (guard sales.manage) so KASIR can load it without
 * product.* permissions.
 *
 * Guard = product.* (MVP, doc 51 §10.1 OQ-T1): topping catalog is master data
 * like UOM/Supplier, so no new permission/seed is introduced.
 *
 * GET    /api/v1/toppings       → list   (product.read)
 * GET    /api/v1/toppings/:id   → detail (product.read)
 * POST   /api/v1/toppings       → create (product.manage)
 * PUT    /api/v1/toppings/:id   → update (product.manage)
 * DELETE /api/v1/toppings/:id   → delete (product.manage)
 */
@ApiTags('Toppings')
@ApiBearerAuth()
@Controller('toppings')
export class ToppingController {
  constructor(
    private readonly getUseCase: GetToppingsUseCase,
    private readonly createUseCase: CreateToppingUseCase,
    private readonly updateUseCase: UpdateToppingUseCase,
    private readonly deleteUseCase: DeleteToppingUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  private _present(topping: Topping) {
    return {
      id: topping.id,
      toppingProductId: topping.toppingProductId,
      toppingName: topping.toppingName,
      toppingSku: topping.toppingSku,
      uomId: topping.uomId,
      uomCode: topping.uomCode,
      uomName: topping.uomName,
      defaultQtyPerItem: topping.defaultQtyPerItem,
      extraPrice: topping.extraPrice,
      sortOrder: topping.sortOrder,
      isActive: topping.isActive,
      createdAt: topping.createdAt,
      updatedAt: topping.updatedAt,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'List the global topping catalog' })
  @ApiResponse({ status: 200, description: 'List of toppings' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.read' })
  async list(@GetUser() user: JwtAccessPayload) {
    const rows = await this.getUseCase.list(this._companyId(user));
    return successResponse(rows.map((row) => this._present(row)));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'Get a global topping catalog entry by ID' })
  @ApiParam({ name: 'id', description: 'Topping UUID' })
  @ApiResponse({ status: 200, description: 'Topping data' })
  @ApiResponse({ status: 404, description: 'Topping not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const topping = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(this._present(topping));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Add an entry to the global topping catalog' })
  @ApiResponse({ status: 201, description: 'Topping created' })
  @ApiResponse({ status: 400, description: 'Validation error (qty <= 0, extra price < 0, invalid product type)' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing product.manage' })
  @ApiResponse({ status: 404, description: 'Topping product not found' })
  @ApiResponse({ status: 409, description: 'Topping product already in the catalog' })
  async create(@Body() dto: CreateToppingDto, @GetUser() user: JwtAccessPayload) {
    const topping = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(this._present(topping));
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Update a topping (qty / extra price / sort order / active flag)' })
  @ApiParam({ name: 'id', description: 'Topping UUID' })
  @ApiResponse({ status: 200, description: 'Topping updated' })
  @ApiResponse({ status: 400, description: 'Validation error (qty <= 0, extra price < 0)' })
  @ApiResponse({ status: 404, description: 'Topping not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateToppingDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const topping = await this.updateUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(this._present(topping));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.manage')
  @ApiOperation({ summary: 'Delete a topping from the catalog' })
  @ApiParam({ name: 'id', description: 'Topping UUID' })
  @ApiResponse({ status: 200, description: 'Topping deleted' })
  @ApiResponse({ status: 404, description: 'Topping not found' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
