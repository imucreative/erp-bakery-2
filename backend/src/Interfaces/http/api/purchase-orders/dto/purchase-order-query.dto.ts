import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString, IsUUID } from 'class-validator';

export class PurchaseOrderQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by supplier UUID' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Filter by destination outlet UUID' })
  @IsOptional()
  @IsUUID()
  destinationOutletId?: string;

  @ApiPropertyOptional({ description: 'Filter by source purchase request UUID' })
  @IsOptional()
  @IsUUID()
  purchaseRequestId?: string;

  @ApiPropertyOptional({ description: 'Search by PO number or notes' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'true',
    description:
      'Picker filter: when "true", return only APPROVED POs that still have ' +
      'remaining receivable quantity (used when choosing a source PO for a new ' +
      'Goods Receipt). Fully-received POs are excluded.',
  })
  @IsOptional()
  @IsBooleanString()
  receivable?: string;
}
