import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';

/**
 * DashboardModule
 *
 * Dashboard use cases and DashboardRepository are provided & exported by
 * InfrastructureModule (@Global) — no re-declaration needed here.
 */
@Module({
  controllers: [DashboardController],
})
export class DashboardModule {}
