import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PurchaseReturnQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (DRAFT, SUBMITTED, COMPLETED, CANCELLED)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by source goods receipt UUID' })
  @IsOptional()
  @IsUUID()
  goodsReceiptId?: string;

  @ApiPropertyOptional({ description: 'Filter by supplier UUID' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Filter by outlet UUID' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Search by return number or notes' })
  @IsOptional()
  @IsString()
  search?: string;
}
