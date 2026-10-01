import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Query for GET /goods-receipts/outstanding — compute the remaining receivable
 * quantity per PO line for a NEW or being-edited GR.
 */
export class GoodsReceiptOutstandingQueryDto {
  @ApiProperty({ description: 'Source purchase order UUID (APPROVED)' })
  @IsUUID()
  purchaseOrderId!: string;

  @ApiPropertyOptional({
    description:
      "Edit mode: exclude this GR's own consumption so it is not counted against itself",
  })
  @IsOptional()
  @IsUUID()
  excludeGoodsReceiptId?: string;
}
