import { Module } from '@nestjs/common';
import { GoodsReceiptController } from './goods-receipt.controller';

/**
 * GoodsReceiptModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [GoodsReceiptController],
})
export class GoodsReceiptModule {}
