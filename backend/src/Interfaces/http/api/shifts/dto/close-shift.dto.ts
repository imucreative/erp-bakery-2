import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @ApiProperty({ example: 750000, description: 'Physical drawer cash counted at close (>= 0)' })
  @IsNumber()
  @Min(0)
  actualCash!: number;

  @ApiPropertyOptional({ description: 'Optional close notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
