import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';

/**
 * InventoryModule
 *
 * Inventory use cases and InventoryRepository are provided & exported by
 * InfrastructureModule (@Global) — no re-declaration needed here.
 */
@Module({
  controllers: [InventoryController],
})
export class InventoryModule {}
