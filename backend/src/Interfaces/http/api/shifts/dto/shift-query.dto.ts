import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ShiftQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ description: 'Filter by status (OPEN, CLOSED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by outlet UUID' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Filter by cashier user UUID' })
  @IsOptional()
  @IsUUID()
  cashierUserId?: string;
}
