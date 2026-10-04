import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for POST /sales/orders/:id/returns — full-order refund (doc 51 §8).
 * The reason is optional free-text; the refunded amount and lines are derived
 * server-side from the order (full-order refund), so there is no body for them.
 */
export class RefundSalesOrderDto {
  @ApiPropertyOptional({ description: 'Optional refund reason (free-text)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
