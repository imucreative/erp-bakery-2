import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @ApiProperty({ example: 'Roti Tawar Gandum', required: false, maxLength: 150 })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiProperty({ example: '8991234567890', required: false, maxLength: 50, nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({
    example: 'FINISHED_GOODS',
    required: false,
    description: 'Product type code (source of truth: GET /product-types)',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  productType?: string;

  @ApiProperty({ example: 5000, required: false, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  purchasePrice?: number;

  @ApiProperty({ example: 12000, required: false, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sellingPrice?: number;

  @ApiProperty({ example: 10, required: false, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minimumStock?: number;

  @ApiProperty({ example: 3, required: false, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  shelfLifeDays?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isBatchTracked?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'When true + sold MADE_TO_ORDER, POS shows the global topping catalog',
  })
  @IsBoolean()
  @IsOptional()
  hasToppings?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the product' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
