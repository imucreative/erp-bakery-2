import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Query DTO for GET /production/producible — producible-quantity preview.
 * Both the finished product and the outlet are required; the backend derives
 * the active recipe and computes capacity from current ingredient stock.
 */
export class ProducibleQueryDto {
  @ApiProperty({ description: 'Finished product UUID to produce' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Outlet UUID whose ingredient stock is used' })
  @IsUUID()
  outletId!: string;
}
