import { Module } from '@nestjs/common';
import { PurchaseRequestController } from './purchase-request.controller';

/**
 * PurchaseRequestModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [PurchaseRequestController],
})
export class PurchaseRequestModule {}
