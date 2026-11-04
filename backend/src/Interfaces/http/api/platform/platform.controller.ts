import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformRepository } from '../../../../Domains/platform/PlatformRepository';
import { SuperAdminOnly } from '../../decorators/super-admin-only.decorator';
import { listResponse } from '../../../../Commons/helpers/response.helper';
import { PlatformUserQueryDto } from './dto/platform-user-query.dto';

/**
 * PlatformController
 *
 * Cross-tenant endpoints for the platform console (SUPER_ADMIN only).
 * Read-only: the platform console never mutates tenant data.
 *
 * GET /api/v1/platform/users → list users across all companies
 */
@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformRepository: PlatformRepository) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'List users across all companies (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Paginated cross-tenant user list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SUPER_ADMIN only' })
  async listUsers(@Query() query: PlatformUserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { rows, total } = await this.platformRepository.listUsers({
      page,
      limit,
      search: query.search,
      companyId: query.companyId,
    });
    return listResponse(rows, total, page, limit);
  }
}
