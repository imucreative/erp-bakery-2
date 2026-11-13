import { Module } from '@nestjs/common';
import { UomDimensionController } from './uom-dimension.controller';

/**
 * UomDimensionModule
 *
 * Repository and use cases are provided by the @Global() InfrastructureModule.
 */
@Module({
  controllers: [UomDimensionController],
})
export class UomDimensionModule {}
