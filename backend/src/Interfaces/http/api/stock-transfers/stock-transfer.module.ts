import { Module } from '@nestjs/common';
import { StockTransferController } from './stock-transfer.controller';

/**
 * StockTransferModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [StockTransferController],
})
export class StockTransferModule {}
