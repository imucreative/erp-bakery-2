import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Body for the cancel action. `note` is optional.
 */
export class GoodsReceiptActionDto {
  @ApiPropertyOptional({ description: 'Optional note/reason for the transition' })
  @IsOptional()
  @IsString()
  note?: string;
}
