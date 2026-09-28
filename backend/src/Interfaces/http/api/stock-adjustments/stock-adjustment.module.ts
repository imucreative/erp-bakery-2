import { Module } from '@nestjs/common';
import { StockAdjustmentController } from './stock-adjustment.controller';

/**
 * StockAdjustmentModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [StockAdjustmentController],
})
export class StockAdjustmentModule {}
