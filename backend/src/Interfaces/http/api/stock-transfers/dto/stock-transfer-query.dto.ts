import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StockTransferQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ description: 'Filter by source outlet UUID' })
  @IsOptional()
  @IsUUID()
  sourceOutletId?: string;

  @ApiPropertyOptional({ description: 'Filter by destination outlet UUID' })
  @IsOptional()
  @IsUUID()
  destinationOutletId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (DRAFT, SUBMITTED, IN_TRANSIT, COMPLETED, CANCELLED)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by transfer number or notes' })
  @IsOptional()
  @IsString()
  search?: string;
}
