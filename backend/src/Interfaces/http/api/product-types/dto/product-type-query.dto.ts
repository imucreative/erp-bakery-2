import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ProductTypeQueryDto {
  @ApiProperty({
    required: false,
    enum: ['true', 'false'],
    description: 'Set true to include inactive rows (master-data management page)',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeInactive?: string;
}
