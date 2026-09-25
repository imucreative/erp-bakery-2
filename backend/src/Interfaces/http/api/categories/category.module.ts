import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';

/**
 * CategoryModule
 *
 * Use cases and CategoryRepository are provided and exported by
 * InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [CategoryController],
})
export class CategoryModule {}
