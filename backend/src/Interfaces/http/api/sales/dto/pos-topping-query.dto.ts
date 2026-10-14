import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Query for GET /sales/pos/toppings. The optional `outletId` turns the global
 * topping catalog into a per-outlet view: when present, each entry carries the
 * outlet's availableQty/expiredQty and the outletId is authorized against the
 * caller accessible outlets (403 when not). When absent the catalog is returned
 * without stock figures (both collapse to 0) — unchanged behaviour.
 */
export class PosToppingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by outlet UUID (POS terminal context)' })
  @IsOptional()
  @IsUUID()
  outletId?: string;
}
