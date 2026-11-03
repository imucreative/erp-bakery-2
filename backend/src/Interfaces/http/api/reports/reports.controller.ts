import { Controller, Get, HttpCode, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { GetSalesReportUseCase } from '../../../../Applications/use_case/reports/GetSalesReportUseCase';
import { GetInventoryReportUseCase } from '../../../../Applications/use_case/reports/GetInventoryReportUseCase';
import { GetProductionReportUseCase } from '../../../../Applications/use_case/reports/GetProductionReportUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { InventoryReportQueryDto } from './dto/inventory-report-query.dto';
import { ProductionReportQueryDto } from './dto/production-report-query.dto';
import { ReportExportService } from './report-export.service';

/**
 * ReportsController — read-only business reports (doc 54).
 * Company-scoped, permission-guarded (reports.read).
 *
 * GET /api/v1/reports/sales        → Sales report with filters
 * GET /api/v1/reports/inventory    → Inventory report with filters
 * GET /api/v1/reports/production   → Production report with filters
 * GET /api/v1/reports/sales/export        → Export sales report to CSV
 * GET /api/v1/reports/inventory/export    → Export inventory report to CSV
 * GET /api/v1/reports/production/export   → Export production report to CSV
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly getSalesReportUseCase: GetSalesReportUseCase,
    private readonly getInventoryReportUseCase: GetInventoryReportUseCase,
    private readonly getProductionReportUseCase: GetProductionReportUseCase,
    private readonly reportExportService: ReportExportService,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get('sales')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Sales report with date range and outlet filters' })
  @ApiResponse({ status: 200, description: 'Sales report data' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing reports.read' })
  async getSalesReport(@Query() dto: SalesReportQueryDto, @GetUser() user: JwtAccessPayload) {
    const report = await this.getSalesReportUseCase.execute(this._companyId(user), {
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      outletId: dto.outletId,
      status: dto.status,
      topProductsLimit: dto.topProductsLimit,
    });
    return successResponse(report);
  }

  @Get('inventory')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Inventory report with outlet and product filters' })
  @ApiResponse({ status: 200, description: 'Inventory report data' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing reports.read' })
  async getInventoryReport(
    @Query() dto: InventoryReportQueryDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const includeExpired = dto.includeExpired === 'true';
    const report = await this.getInventoryReportUseCase.execute(this._companyId(user), {
      outletId: dto.outletId,
      productId: dto.productId,
      includeExpired,
    });
    return successResponse(report);
  }

  @Get('production')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Production report with date range, outlet, and recipe filters' })
  @ApiResponse({ status: 200, description: 'Production report data' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing reports.read' })
  async getProductionReport(
    @Query() dto: ProductionReportQueryDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const report = await this.getProductionReportUseCase.execute(this._companyId(user), {
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      outletId: dto.outletId,
      recipeId: dto.recipeId,
    });
    return successResponse(report);
  }

  @Get('sales/export')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Export sales report to CSV' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'outletId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'topProductsLimit', required: false, enum: [5, 10, 20, 50] })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportSalesReport(
    @Query() dto: SalesReportQueryDto,
    @GetUser() user: JwtAccessPayload,
    @Res() res: FastifyReply,
  ) {
    const report = await this.getSalesReportUseCase.execute(this._companyId(user), {
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      outletId: dto.outletId,
      status: dto.status,
      topProductsLimit: dto.topProductsLimit,
    });

    const csv = this.reportExportService.exportSalesToCsv(report);
    const filename = `sales-report-${dto.dateFrom}-to-${dto.dateTo}.csv`;

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('inventory/export')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Export inventory report to CSV' })
  @ApiQuery({ name: 'outletId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'includeExpired', required: false })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportInventoryReport(
    @Query() dto: InventoryReportQueryDto,
    @GetUser() user: JwtAccessPayload,
    @Res() res: FastifyReply,
  ) {
    const includeExpired = dto.includeExpired === 'true';
    const report = await this.getInventoryReportUseCase.execute(this._companyId(user), {
      outletId: dto.outletId,
      productId: dto.productId,
      includeExpired,
    });

    const csv = this.reportExportService.exportInventoryToCsv(report);
    const filename = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('production/export')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Export production report to CSV' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'outletId', required: false })
  @ApiQuery({ name: 'recipeId', required: false })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportProductionReport(
    @Query() dto: ProductionReportQueryDto,
    @GetUser() user: JwtAccessPayload,
    @Res() res: FastifyReply,
  ) {
    const report = await this.getProductionReportUseCase.execute(this._companyId(user), {
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      outletId: dto.outletId,
      recipeId: dto.recipeId,
    });

    const csv = this.reportExportService.exportProductionToCsv(report);
    const filename = `production-report-${dto.dateFrom}-to-${dto.dateTo}.csv`;

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
