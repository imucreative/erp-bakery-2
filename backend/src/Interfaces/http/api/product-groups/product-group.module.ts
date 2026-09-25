import { Module } from '@nestjs/common';
import { ProductGroupController } from './product-group.controller';

/**
 * ProductGroupModule
 *
 * Use cases and ProductGroupRepository are provided and exported by
 * InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [ProductGroupController],
})
export class ProductGroupModule {}
