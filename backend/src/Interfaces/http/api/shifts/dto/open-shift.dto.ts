import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class OpenShiftDto {
  @ApiProperty({ description: 'Outlet UUID the shift is opened for' })
  @IsUUID()
  outletId!: string;

  @ApiProperty({ example: 500000, description: 'Opening cash in the drawer (>= 0)' })
  @IsNumber()
  @Min(0)
  openingCash!: number;

  @ApiPropertyOptional({ description: 'Optional shift notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
