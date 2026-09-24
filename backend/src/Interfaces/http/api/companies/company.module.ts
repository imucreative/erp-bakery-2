import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';

/**
 * CompanyModule
 *
 * RegisterCompanyUseCase and CompanyRepository are provided and exported
 * by InfrastructureModule (@Global) — no re-declaration needed.
 */
@Module({
  controllers: [CompanyController],
})
export class CompanyModule {}
