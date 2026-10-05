import { Module } from '@nestjs/common';
import { ToppingController } from './topping.controller';

/**
 * ToppingModule — GLOBAL topping catalog (doc 51 §5.0).
 *
 * Use cases and ToppingRepository are provided and exported by
 * InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [ToppingController],
})
export class ToppingModule {}
