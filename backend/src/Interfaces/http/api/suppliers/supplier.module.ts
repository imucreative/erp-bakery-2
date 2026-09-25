import { Module } from '@nestjs/common';
import { SupplierController } from './supplier.controller';

/**
 * SupplierModule
 *
 * Use cases and SupplierRepository are provided and exported by
 * InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [SupplierController],
})
export class SupplierModule {}
