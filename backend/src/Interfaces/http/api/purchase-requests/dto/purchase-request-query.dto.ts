import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PurchaseRequestQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by destination outlet UUID' })
  @IsOptional()
  @IsUUID()
  destinationOutletId?: string;

  @ApiPropertyOptional({ description: 'Search by PR number or notes' })
  @IsOptional()
  @IsString()
  search?: string;
}
