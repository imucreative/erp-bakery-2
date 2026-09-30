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

export class CreatePurchaseRequestItemDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 10, description: 'Positive quantity requested' })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ description: 'UOM UUID' })
  @IsUUID()
  uomId!: string;

  @ApiProperty({ example: 5000, description: 'Estimated unit price (>= 0)' })
  @IsNumber()
  @Min(0)
  estimatedPrice!: number;
}

export class CreatePurchaseRequestDto {
  @ApiProperty({ description: 'Destination outlet UUID (must belong to the company)' })
  @IsUUID()
  destinationOutletId!: string;

  @ApiProperty({
    example: '2026-10-05',
    description: 'Expected delivery date (must be tomorrow or later)',
  })
  @IsDateString()
  expectedDate!: string;

  @ApiPropertyOptional({ description: 'Optional header notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseRequestItemDto], description: 'PR line items' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequestItemDto)
  items!: CreatePurchaseRequestItemDto[];
}
