import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateGoodsReceiptItemDto {
  @ApiProperty({ description: 'Source Purchase Order item UUID' })
  @IsUUID()
  purchaseOrderItemId!: string;

  @ApiProperty({ description: 'Product UUID (must match the PO line product)' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 10, description: 'Accepted quantity (>= 0)' })
  @IsNumber()
  @Min(0)
  acceptedQuantity!: number;

  @ApiProperty({ example: 0, description: 'Rejected / discrepancy quantity (>= 0)' })
  @IsNumber()
  @Min(0)
  rejectedQuantity!: number;

  @ApiProperty({ description: 'UOM UUID' })
  @IsUUID()
  uomId!: string;

  @ApiPropertyOptional({
    description:
      'Batch number. Required for a batch-tracked product when acceptedQuantity > 0.',
  })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Optional lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description:
      'Expiry date. Required for a batch-tracked product when acceptedQuantity > 0.',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateGoodsReceiptDto {
  @ApiProperty({ description: 'Source Purchase Order UUID (must be APPROVED)' })
  @IsUUID()
  purchaseOrderId!: string;

  @ApiProperty({ example: '2026-10-10', description: 'Receive date (valid date)' })
  @IsDateString()
  receiveDate!: string;

  @ApiPropertyOptional({ description: 'Optional header notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: [CreateGoodsReceiptItemDto],
    description:
      'GR line items. Optional: when omitted, lines are prefilled from the PO outstanding (acceptedQuantity = outstanding, rejectedQuantity = 0).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items?: CreateGoodsReceiptItemDto[];
}
