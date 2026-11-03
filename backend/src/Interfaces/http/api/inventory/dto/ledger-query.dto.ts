import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class LedgerQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by batch UUID' })
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional({
    description: 'Filter by movement type (PURCHASE, SALE, ADJUSTMENT_IN, ...)',
  })
  @IsOptional()
  @IsString()
  movementType?: string;

  @ApiPropertyOptional({ description: 'First ledger date, inclusive (WIB, YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Dari tanggal harus berformat YYYY-MM-DD.' })
  @IsDateString({ strict: true }, { message: 'Dari tanggal tidak valid. Pilih tanggal yang benar.' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Last ledger date, inclusive (WIB, YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sampai tanggal harus berformat YYYY-MM-DD.' })
  @IsDateString({ strict: true }, { message: 'Sampai tanggal tidak valid. Pilih tanggal yang benar.' })
  dateTo?: string;
}
