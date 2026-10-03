import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Query for the returnable lookup. The source Goods Receipt must be COMPLETED.
 */
export class ReturnableQueryDto {
  @ApiProperty({ description: 'Source Goods Receipt UUID (must be COMPLETED)' })
  @IsUUID()
  goodsReceiptId!: string;
}
