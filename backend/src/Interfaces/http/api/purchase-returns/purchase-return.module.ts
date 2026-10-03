import { Module } from '@nestjs/common';
import { PurchaseReturnController } from './purchase-return.controller';

/**
 * PurchaseReturnModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [PurchaseReturnController],
})
export class PurchaseReturnModule {}
