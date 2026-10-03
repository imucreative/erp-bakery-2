import { Module } from '@nestjs/common';
import { ProductionOrderController, ProductionController } from './production-order.controller';

/**
 * ProductionOrderModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [ProductionOrderController, ProductionController],
})
export class ProductionOrderModule {}
