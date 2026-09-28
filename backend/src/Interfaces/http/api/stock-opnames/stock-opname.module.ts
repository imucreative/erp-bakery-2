import { Module } from '@nestjs/common';
import { StockOpnameController } from './stock-opname.controller';

/**
 * StockOpnameModule
 * Use cases provided & exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [StockOpnameController],
})
export class StockOpnameModule {}
