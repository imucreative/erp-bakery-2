import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductUomConversionController } from './product-uom-conversion.controller';

/**
 * ProductModule
 *
 * Use cases and repositories are provided and exported by InfrastructureModule
 * (@Global) — no re-declaration needed. Hosts the product CRUD controller and
 * the per-product UOM conversion sub-resource controller.
 */
@Module({
  controllers: [ProductController, ProductUomConversionController],
})
export class ProductModule {}
