import { Module } from '@nestjs/common';
import { RecipeController } from './recipe.controller';

/**
 * RecipeModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [RecipeController],
})
export class RecipeModule {}
