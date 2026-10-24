import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetOwnerDashboardUseCase } from '../../../../Applications/use_case/dashboard/GetOwnerDashboardUseCase';
import { GetOutletDashboardUseCase } from '../../../../Applications/use_case/dashboard/GetOutletDashboardUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';

/**
 * DashboardController — read-only business dashboards (doc 54).
 * Company-scoped, permission-guarded (dashboard.read).
 *
 * GET /api/v1/dashboard/owner    → Owner dashboard (company-wide metrics)
 * GET /api/v1/dashboard/outlet   → Outlet dashboard (scoped to outletId)
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getOwnerDashboardUseCase: GetOwnerDashboardUseCase,
    private readonly getOutletDashboardUseCase: GetOutletDashboardUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get('owner')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Owner dashboard — company-wide business metrics' })
  @ApiResponse({
    status: 200,
    description: 'Owner dashboard summary',
    schema: {
      example: {
        success: true,
        data: {
          revenueToday: 1500000,
          salesToday: 25,
          lowStockCount: 3,
          expiredCount: 1,
          salesTrend: [
            { date: '2026-10-19', revenue: 1200000, orderCount: 20 },
            { date: '2026-10-20', revenue: 1350000, orderCount: 22 },
          ],
          expiringSoon: [
            {
              productId: 'abc123',
              productName: 'Roti Coklat',
              batchNo: 'B-001',
              expiryDate: '2026-11-15',
              qty: 10,
              uomName: 'pcs',
            },
          ],
          topProducts: [
            {
              productId: 'abc123',
              productName: 'Roti Coklat',
              qtySold: 50,
              revenue: 1500000,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — missing dashboard.read' })
  async getOwnerDashboard(@GetUser() user: JwtAccessPayload) {
    const summary = await this.getOwnerDashboardUseCase.execute(this._companyId(user));
    return successResponse(summary);
  }

  @Get('outlet')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Outlet dashboard — metrics scoped to a single outlet' })
  @ApiQuery({
    name: 'outletId',
    required: true,
    description: 'Outlet ID to scope the dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Outlet dashboard summary',
    schema: {
      example: {
        success: true,
        data: {
          outletId: 'outlet-123',
          outletName: 'Outlet Pusat',
          salesToday: 15,
          revenueToday: 750000,
          lowStockCount: 2,
          pendingRequests: 0,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden — missing dashboard.read' })
  async getOutletDashboard(
    @Query('outletId') outletId: string,
    @GetUser() user: JwtAccessPayload,
  ) {
    if (!outletId) {
      throw new AuthorizationError('DASHBOARD.OUTLET_REQUIRED');
    }

    const summary = await this.getOutletDashboardUseCase.execute(
      this._companyId(user),
      outletId,
    );
    return successResponse(summary);
  }
}
