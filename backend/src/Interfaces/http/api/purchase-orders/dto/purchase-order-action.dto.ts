import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Body for approve / reject / cancel actions. `note` is optional at the DTO
 * layer; the reject use case enforces that a reason is mandatory.
 */
export class PurchaseOrderActionDto {
  @ApiPropertyOptional({ description: 'Optional note/reason for the transition' })
  @IsOptional()
  @IsString()
  note?: string;
}
