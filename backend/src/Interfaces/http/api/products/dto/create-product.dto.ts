import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PRODUCT_TYPES } from '../../../../../Domains/products/productTypes';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-ROTI-001', description: 'Stock keeping unit (unique per company, max 50)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku!: string;

  @ApiProperty({ example: '8991234567890', required: false, maxLength: 50, nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({ example: 'Roti Tawar Gandum', description: 'Product name (max 150 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'b1e5...uuid', description: 'Product group UUID' })
  @IsUUID('4')
  productGroupId!: string;

  @ApiProperty({ example: 'c2f6...uuid', description: 'Category UUID (must belong to the product group)' })
  @IsUUID('4')
  categoryId!: string;

  @ApiProperty({ example: 'd3a7...uuid', description: 'Unit of measure UUID' })
  @IsUUID('4')
  uomId!: string;

  @ApiProperty({ example: 'e4b8...uuid', description: 'Supplier UUID' })
  @IsUUID('4')
  supplierId!: string;

  @ApiProperty({ example: 'FINISHED_GOODS', enum: PRODUCT_TYPES })
  @IsIn(PRODUCT_TYPES as unknown as string[])
  productType!: string;

  @ApiProperty({ example: 5000, required: false, default: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  purchasePrice?: number;

  @ApiProperty({ example: 12000, required: false, default: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sellingPrice?: number;

  @ApiProperty({ example: 10, required: false, default: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minimumStock?: number;

  @ApiProperty({ example: 3, required: false, default: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  shelfLifeDays?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isBatchTracked?: boolean;
}
