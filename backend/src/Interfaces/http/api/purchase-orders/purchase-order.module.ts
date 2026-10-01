import { Module } from '@nestjs/common';
import { PurchaseOrderController } from './purchase-order.controller';

/**
 * PurchaseOrderModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [PurchaseOrderController],
})
export class PurchaseOrderModule {}
