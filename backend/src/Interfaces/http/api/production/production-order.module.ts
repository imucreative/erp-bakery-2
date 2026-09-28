import { Module } from '@nestjs/common';
import { ProductionOrderController } from './production-order.controller';

/**
 * ProductionOrderModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [ProductionOrderController],
})
export class ProductionOrderModule {}
