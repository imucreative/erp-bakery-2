import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CategoryQueryDto {
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

  @ApiProperty({ required: false, description: 'Search by category name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by parent product group UUID' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  productGroupId?: string;

  // String enum: query params arrive as text; parsed explicitly in the controller.
  @ApiProperty({ required: false, enum: ['true', 'false'], description: 'Filter by active state' })
  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}
