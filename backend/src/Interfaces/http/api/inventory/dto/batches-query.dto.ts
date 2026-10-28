import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString, IsUUID } from 'class-validator';

export class BatchesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (default 1)' })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ example: 10, description: 'Items per page (default 10, max 100)' })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ description: 'Filter by outlet UUID' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Filter by product UUID' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter by batch status (ACTIVE, EXPIRED, CONSUMED, QUARANTINE)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description:
      'Filter by derived operational status at the current WIB date (ACTIVE, EXPIRED, CONSUMED, QUARANTINE)',
  })
  @IsOptional()
  @IsString()
  operationalStatus?: string;

  @ApiPropertyOptional({
    example: 'false',
    description: 'Include synthetic non-batch rows (default false)',
  })
  @IsOptional()
  @IsBooleanString()
  includeNonBatch?: string;
}
