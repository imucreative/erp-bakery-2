import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Body for approve / reject / cancel actions. `note` is optional at the DTO
 * layer; the reject use case enforces that a reason is mandatory (doc 43 §4).
 */
export class PurchaseRequestActionDto {
  @ApiPropertyOptional({ description: 'Optional note/reason for the transition' })
  @IsOptional()
  @IsString()
  note?: string;
}
