import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UomDimensionQueryDto {
  @ApiPropertyOptional({ enum: ['true', 'false'], description: 'Include inactive dimensions' })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeInactive?: string;
}
