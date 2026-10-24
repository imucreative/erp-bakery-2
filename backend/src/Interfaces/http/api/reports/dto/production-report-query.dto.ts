import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO: ProductionReportQueryDto
 *
 * Query parameters untuk GET /reports/production
 */
export class ProductionReportQueryDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-10-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-10-25' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ description: 'Outlet ID filter' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Recipe ID filter' })
  @IsOptional()
  @IsString()
  recipeId?: string;
}
