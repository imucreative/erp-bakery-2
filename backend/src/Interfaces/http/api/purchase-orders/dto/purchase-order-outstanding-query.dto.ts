import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Query for GET /purchase-orders/outstanding — compute the remaining orderable
 * quota per PR line for a NEW or being-edited PO.
 */
export class PurchaseOrderOutstandingQueryDto {
  @ApiProperty({ description: 'Source purchase request UUID (APPROVED)' })
  @IsUUID()
  purchaseRequestId!: string;

  @ApiPropertyOptional({
    description:
      'Edit mode: exclude this PO\'s own consumption so it is not counted against itself',
  })
  @IsOptional()
  @IsUUID()
  excludePurchaseOrderId?: string;
}
