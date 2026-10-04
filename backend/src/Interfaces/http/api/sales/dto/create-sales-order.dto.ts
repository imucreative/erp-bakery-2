import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSalesOrderToppingDto {
  @ApiProperty({ description: 'Topping product UUID (must be allowed for the product)' })
  @IsUUID()
  toppingProductId!: string;
}

export class CreateSalesOrderItemDto {
  @ApiProperty({ description: 'Sellable product UUID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2, description: 'Quantity (> 0)' })
  @IsNumber()
  @Min(0.001)
  qty!: number;

  @ApiPropertyOptional({ example: 0, description: 'Per-item discount (>= 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  itemDiscount?: number;

  @ApiPropertyOptional({
    type: [CreateSalesOrderToppingDto],
    description: 'Selected toppings (MADE_TO_ORDER only)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderToppingDto)
  toppings?: CreateSalesOrderToppingDto[];
}

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Outlet UUID' })
  @IsUUID()
  outletId!: string;

  @ApiProperty({ description: 'OPEN shift UUID for this cashier + outlet' })
  @IsUUID()
  shiftId!: string;

  @ApiPropertyOptional({ description: 'Optional customer name (free text)' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 0, description: 'Order-level discount (>= 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderDiscount?: number;

  @ApiProperty({ type: [CreateSalesOrderItemDto], description: 'Cart items (>= 1)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items!: CreateSalesOrderItemDto[];
}
