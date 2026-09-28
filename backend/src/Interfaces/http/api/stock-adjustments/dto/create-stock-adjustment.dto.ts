import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateStockAdjustmentItemDto {
  @ApiProperty({ description: 'Target inventory batch UUID' })
  @IsUUID()
  batchId!: string;

  @ApiProperty({ description: 'Product UUID of the batch' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: ['IN', 'OUT'], description: 'Adjustment direction' })
  @IsEnum(['IN', 'OUT'])
  direction!: 'IN' | 'OUT';

  @ApiProperty({ example: 5, description: 'Positive quantity to adjust' })
  @IsNumber()
  @IsPositive()
  qty!: number;

  @ApiProperty({
    enum: ['STOCK_COUNT', 'DAMAGED', 'EXPIRED', 'LOST', 'FOUND', 'CORRECTION', 'OTHER'],
    description: 'Mandatory reason code',
  })
  @IsEnum(['STOCK_COUNT', 'DAMAGED', 'EXPIRED', 'LOST', 'FOUND', 'CORRECTION', 'OTHER'])
  reason!: string;

  @ApiPropertyOptional({ description: 'Optional free-text reason detail' })
  @IsOptional()
  @IsString()
  reasonDescription?: string;
}

export class CreateStockAdjustmentDto {
  @ApiProperty({ description: 'Outlet UUID where the adjustment applies' })
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ example: '2026-09-28', description: 'Adjustment date (defaults today)' })
  @IsOptional()
  @IsString()
  adjustmentDate?: string;

  @ApiPropertyOptional({ description: 'Optional header notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockAdjustmentItemDto], description: 'Adjustment lines' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockAdjustmentItemDto)
  items!: CreateStockAdjustmentItemDto[];
}
