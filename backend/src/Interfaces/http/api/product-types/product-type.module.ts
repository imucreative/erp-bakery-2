import { Module } from '@nestjs/common';
import { ProductTypeController } from './product-type.controller';

/**
 * ProductTypeModule
 *
 * Repository is provided by the @Global() InfrastructureModule.
 */
@Module({
  controllers: [ProductTypeController],
})
export class ProductTypeModule {}
