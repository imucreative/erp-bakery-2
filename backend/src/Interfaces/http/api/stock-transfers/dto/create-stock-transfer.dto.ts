import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateStockTransferItemDto {
  @ApiProperty({ description: 'Source inventory batch UUID' })
  @IsUUID()
  sourceBatchId!: string;

  @ApiProperty({ description: 'Product UUID of the batch' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 10, description: 'Positive quantity to transfer' })
  @IsNumber()
  @IsPositive()
  qty!: number;
}

export class CreateStockTransferDto {
  @ApiProperty({ description: 'Source outlet UUID' })
  @IsUUID()
  sourceOutletId!: string;

  @ApiProperty({ description: 'Destination outlet UUID (must differ from source)' })
  @IsUUID()
  destinationOutletId!: string;

  @ApiPropertyOptional({ example: '2026-09-28', description: 'Transfer date (defaults today)' })
  @IsOptional()
  @IsString()
  transferDate?: string;

  @ApiPropertyOptional({ description: 'Optional header notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockTransferItemDto], description: 'Transfer lines' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items!: CreateStockTransferItemDto[];
}
