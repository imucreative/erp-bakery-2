import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RecipeQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ description: 'Filter by finished product UUID' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Filter by status (DRAFT, ACTIVE, ARCHIVED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by recipe name or number' })
  @IsOptional()
  @IsString()
  search?: string;
}
