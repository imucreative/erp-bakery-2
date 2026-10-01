import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 10, description: 'Positive quantity ordered' })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ description: 'UOM UUID' })
  @IsUUID()
  uomId!: string;

  @ApiProperty({ example: 5000, description: 'Agreed unit price (>= 0)' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ example: 11, description: 'Tax percentage (>= 0), e.g. 11 means 11%' })
  @IsNumber()
  @Min(0)
  taxPercent!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Source Purchase Request UUID (must be APPROVED)' })
  @IsUUID()
  purchaseRequestId!: string;

  @ApiProperty({ description: 'Supplier UUID (must belong to the company and be active)' })
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ example: '2026-10-05', description: 'Order date (valid date)' })
  @IsDateString()
  orderDate!: string;

  @ApiPropertyOptional({
    description:
      'Payment term UUID. Optional; when omitted the supplier default is used. Must be active if provided.',
  })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Optional header notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: [CreatePurchaseOrderItemDto],
    description:
      'PO line items. Optional: when omitted, lines are prefilled from the source PR (unitPrice = PR estimatedPrice, taxPercent = 0).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}
