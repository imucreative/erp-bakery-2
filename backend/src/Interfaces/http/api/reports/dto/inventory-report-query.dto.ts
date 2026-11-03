import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

/**
 * DTO: InventoryReportQueryDto
 *
 * Query parameters untuk GET /reports/inventory
 */
export class InventoryReportQueryDto {
  @ApiPropertyOptional({ description: 'Outlet ID filter' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Product ID filter' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Include expired batches',
    default: false,
  })
  @IsOptional()
  @IsString()
  includeExpired?: string;
}
