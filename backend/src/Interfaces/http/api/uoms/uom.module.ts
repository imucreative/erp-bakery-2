import { Module } from '@nestjs/common';
import { UomController } from './uom.controller';

/**
 * UomModule
 *
 * Use cases and UomRepository are provided and exported by
 * InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [UomController],
})
export class UomModule {}
