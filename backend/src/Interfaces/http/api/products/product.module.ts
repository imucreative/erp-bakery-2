import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductUomConversionController } from './product-uom-conversion.controller';

/**
 * ProductModule
 *
 * Use cases and repositories are provided and exported by InfrastructureModule
 * (@Global) — no re-declaration needed. Hosts the product CRUD controller and
 * the per-product UOM conversion sub-resource controller.
 *
 * Topping management moved to the GLOBAL catalog (ToppingModule, /toppings) —
 * the per-product allowed-topping controller was retired (doc 51 §5.1).
 */
@Module({
  controllers: [ProductController, ProductUomConversionController],
})
export class ProductModule {}
