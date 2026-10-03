import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Body for the submit / complete / cancel actions. `note` is optional and is
 * attached to the status-log row of the transition.
 */
export class PurchaseReturnActionDto {
  @ApiPropertyOptional({ description: 'Optional note/reason for the transition' })
  @IsOptional()
  @IsString()
  note?: string;
}
