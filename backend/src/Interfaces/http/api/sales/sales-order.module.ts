import { Module } from '@nestjs/common';
import { SalesOrderController } from './sales-order.controller';

/**
 * SalesOrderModule (POS / Sales Fase 2)
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [SalesOrderController],
})
export class SalesOrderModule {}
