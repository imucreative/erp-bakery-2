import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QaCheckDto {
  @ApiProperty({ example: true, description: 'QA decision: true = passed, false = failed' })
  @IsBoolean()
  passed!: boolean;

  @ApiPropertyOptional({ description: 'QA notes / reason' })
  @IsOptional()
  @IsString()
  qaNotes?: string;
}
