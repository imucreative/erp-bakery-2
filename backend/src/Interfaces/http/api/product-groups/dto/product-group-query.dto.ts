import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ProductGroupQueryDto {
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

  @ApiProperty({ required: false, description: 'Search by product group name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  // Kept as a string enum: query params arrive as text and implicit boolean
  // conversion would turn "false" into true. Parsed explicitly in the controller.
  @ApiProperty({ required: false, enum: ['true', 'false'], description: 'Filter by active state' })
  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}
