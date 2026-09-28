import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStockOpnameDto {
  @ApiProperty({ description: 'Outlet UUID to count' })
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ example: '2026-09-28', description: 'Opname date (defaults today)' })
  @IsOptional()
  @IsString()
  opnameDate?: string;

  @ApiPropertyOptional({ description: 'Optional header notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
