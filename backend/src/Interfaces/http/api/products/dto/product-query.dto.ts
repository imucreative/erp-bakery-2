import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ProductQueryDto {
  @ApiProperty({ required: false, example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false, description: 'Search by product name, sku, or barcode' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    example: 'FINISHED_GOODS',
    description: 'Filter by product type code',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  productType?: string;

  @ApiProperty({ required: false, description: 'Filter by product group UUID' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  productGroupId?: string;

  @ApiProperty({ required: false, description: 'Filter by category UUID' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  categoryId?: string;

  @ApiProperty({ required: false, description: 'Filter by supplier UUID' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  supplierId?: string;

  // String enum: query params arrive as text; parsed explicitly in the controller.
  @ApiProperty({ required: false, enum: ['true', 'false'], description: 'Filter by active state' })
  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}
