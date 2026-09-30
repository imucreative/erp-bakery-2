import { Module } from '@nestjs/common';
import { PaymentTermController } from './payment-term.controller';

/**
 * PaymentTermModule
 *
 * Use cases and PaymentTermRepository are provided and exported by
 * InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [PaymentTermController],
})
export class PaymentTermModule {}
