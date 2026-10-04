import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSalesOrderUseCase } from '../../../../Applications/use_case/sales/CreateSalesOrderUseCase';
import { PaySalesOrderUseCase } from '../../../../Applications/use_case/sales/PaySalesOrderUseCase';
import { VoidSalesOrderUseCase } from '../../../../Applications/use_case/sales/VoidSalesOrderUseCase';
import { RefundSalesOrderUseCase } from '../../../../Applications/use_case/sales/RefundSalesOrderUseCase';
import { GetSalesOrdersUseCase } from '../../../../Applications/use_case/sales/GetSalesOrdersUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { PaySalesOrderDto } from './dto/pay-sales-order.dto';
import { RefundSalesOrderDto } from './dto/refund-sales-order.dto';
import { SalesOrderQueryDto } from './dto/sales-order-query.dto';
import { PosProductQueryDto } from './dto/pos-product-query.dto';

/**
 * SalesOrderController — POS checkout + pay + stock deduction (doc 51 §7/§9/§10).
 * Company-scoped; permission-guarded (write = sales.manage, read = sales.read;
 * the POS grid uses sales.manage per OQ-6 so KASIR can open it without seed
 * changes).
 *
 * POST /sales/orders              checkout -> PENDING_PAYMENT (no stock)
 * POST /sales/orders/:id/pay      pay + FEFO deduct (two modes), atomic
 * POST /sales/orders/:id/void     PENDING_PAYMENT -> CANCELLED
 * POST /sales/orders/:id/returns  PAID -> REFUNDED (full-order, SALE_RETURN)
 * GET  /sales/orders              list
 * GET  /sales/orders/:id          detail
 * GET  /sales/pos/products        POS product grid (mode + toppings)
 * GET  /sales/pos/products/:id/toppings  toppings for a product
 */
@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesOrderController {
  constructor(
    private readonly createUseCase: CreateSalesOrderUseCase,
    private readonly payUseCase: PaySalesOrderUseCase,
    private readonly voidUseCase: VoidSalesOrderUseCase,
    private readonly refundUseCase: RefundSalesOrderUseCase,
    private readonly getUseCase: GetSalesOrdersUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('sales.manage')
  @ApiOperation({ summary: 'Checkout — create a sales order (PENDING_PAYMENT, no stock)' })
  @ApiResponse({ status: 201, description: 'Order created, awaiting payment' })
  @ApiResponse({ status: 400, description: 'Shift not open, invalid topping, or no active recipe' })
  async checkout(@Body() dto: CreateSalesOrderDto, @GetUser() user: JwtAccessPayload) {
    const order = await this.createUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(order);
  }

  @Post('orders/:id/pay')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sales.manage')
  @ApiOperation({ summary: 'Pay + deduct stock FEFO (two modes), atomic' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({ status: 200, description: 'Paid; stock deducted' })
  @ApiResponse({ status: 400, description: 'Payment mismatch or insufficient stock' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Order already paid' })
  async pay(
    @Param('id') id: string,
    @Body() dto: PaySalesOrderDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const order = await this.payUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(order);
  }

  @Post('orders/:id/void')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sales.manage')
  @ApiOperation({ summary: 'Void an unpaid sales order (PENDING_PAYMENT -> CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async void(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const order = await this.voidUseCase.execute(id, this._companyId(user), user.sub);
    return successResponse(order);
  }

  @Post('orders/:id/returns')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sales.manage')
  @ApiOperation({
    summary: 'Refund a paid sales order (full-order, PAID -> REFUNDED; SALE_RETURN reversal)',
  })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({ status: 200, description: 'Refunded; stock returned to original batches' })
  @ApiResponse({ status: 400, description: 'Order is not PAID' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Order already refunded' })
  async refund(
    @Param('id') id: string,
    @Body() dto: RefundSalesOrderDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const { order, salesReturn } = await this.refundUseCase.execute(
      id,
      dto.reason ?? null,
      this._companyId(user),
      user.sub,
    );
    // Response = the REFUNDED order plus the created return (doc 51 §8/§10).
    return successResponse({ ...order, salesReturn });
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sales.read')
  @ApiOperation({ summary: 'List sales orders' })
  @ApiResponse({ status: 200, description: 'Paginated sales order list' })
  async list(@Query() query: SalesOrderQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      {
        limit,
        offset,
        status: query.status,
        outletId: query.outletId,
        shiftId: query.shiftId,
        search: query.search,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get('orders/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sales.read')
  @ApiOperation({ summary: 'Get a sales order by ID (items + toppings + payments)' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({ status: 200, description: 'Sales order detail' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const order = await this.getUseCase.detail(id, companyId);
    // Surface the refund record on the order detail (null unless REFUNDED).
    const salesReturn = await this.getUseCase.returnByOrderId(id, companyId);
    return successResponse({ ...order, salesReturn });
  }

  @Get('pos/products')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sales.manage')
  @ApiOperation({
    summary: 'POS product grid — sellable products + resolved mode + available toppings',
  })
  @ApiResponse({ status: 200, description: 'Paginated POS products' })
  async posProducts(@Query() query: PosProductQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.posProducts(
      { limit, offset, outletId: query.outletId, search: query.search },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get('pos/products/:id/toppings')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sales.manage')
  @ApiOperation({ summary: 'Toppings offered on a sellable product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Available toppings' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async productToppings(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const toppings = await this.getUseCase.productToppings(id, this._companyId(user));
    return successResponse(toppings);
  }
}
