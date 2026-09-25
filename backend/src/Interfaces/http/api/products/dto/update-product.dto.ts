import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PRODUCT_TYPES } from '../../../../../Domains/products/productTypes';

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

  @ApiProperty({ example: 'FINISHED_GOODS', required: false, enum: PRODUCT_TYPES })
  @IsIn(PRODUCT_TYPES as unknown as string[])
  @IsOptional()
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

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the product' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
