import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';

/**
 * ProductModule
 *
 * Use cases and repositories are provided and exported by InfrastructureModule
 * (@Global) — no re-declaration needed. Hosts the product CRUD controller.
 *
 * UOM conversion is now global (doc 52); the per-product conversion sub-resource
 * was retired. Topping management likewise lives in the global catalog.
 */
@Module({
  controllers: [ProductController],
})
export class ProductModule {}
