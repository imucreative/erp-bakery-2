import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class RecordYieldDto {
  @ApiProperty({ example: 38, description: 'Actual finished-goods quantity produced' })
  @IsNumber()
  @IsPositive()
  actualQty!: number;

  @ApiPropertyOptional({ example: 2, description: 'Quantity lost/scrapped', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wasteQty?: number;

  @ApiProperty({ example: '2026-10-05', description: 'Expiry date for the finished-goods batch' })
  @IsString()
  resultExpiredDate!: string;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
