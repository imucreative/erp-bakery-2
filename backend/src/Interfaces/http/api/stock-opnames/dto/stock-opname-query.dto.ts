import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StockOpnameQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ description: 'Filter by outlet UUID' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (DRAFT, COUNTING, SUBMITTED, APPROVED, COMPLETED, CANCELLED)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by opname number or notes' })
  @IsOptional()
  @IsString()
  search?: string;
}
