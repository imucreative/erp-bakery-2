import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportExportService } from './report-export.service';

/**
 * ReportsModule
 *
 * Reports use cases and ReportsRepository are provided & exported by
 * InfrastructureModule (@Global) — no re-declaration needed here.
 * ReportExportService is provided locally for CSV generation.
 */
@Module({
  controllers: [ReportsController],
  providers: [ReportExportService],
})
export class ReportsModule {}
