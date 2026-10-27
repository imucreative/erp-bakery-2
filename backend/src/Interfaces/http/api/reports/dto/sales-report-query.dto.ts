import { IsDateString, IsOptional, IsString, IsIn, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO: SalesReportQueryDto
 *
 * Query parameters untuk GET /reports/sales
 */
export class SalesReportQueryDto {
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

  @ApiPropertyOptional({
    description: 'Order status filter',
    enum: ['PAID', 'REFUNDED', 'CANCELLED'],
    default: 'PAID',
  })
  @IsOptional()
  @IsIn(['PAID', 'REFUNDED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of top product combinations',
    enum: [5, 10, 20, 50],
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @IsIn([5, 10, 20, 50])
  topProductsLimit?: number;
}
