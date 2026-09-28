import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class RecordCountDto {
  @ApiProperty({ example: 8, description: 'Physically counted quantity (>= 0)' })
  @IsNumber()
  @Min(0)
  countedQty!: number;
}
