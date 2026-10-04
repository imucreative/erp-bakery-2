import { Module } from '@nestjs/common';
import { ShiftController } from './shift.controller';

/**
 * ShiftModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [ShiftController],
})
export class ShiftModule {}
