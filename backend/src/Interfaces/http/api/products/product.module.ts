import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';

/**
 * ProductModule
 *
 * Use cases and ProductRepository are provided and exported by
 * InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [ProductController],
})
export class ProductModule {}
