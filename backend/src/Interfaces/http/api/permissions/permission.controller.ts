import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionRepository } from '../../../../Domains/permissions/PermissionRepository';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { RequirePermission } from '../../decorators/require-permission.decorator';

/**
 * PermissionController
 *
 * Global permission catalog — the same for every company. Used by the Role
 * Management UI to render the permission picker grouped Domain → Module → Action.
 *
 * GET /api/v1/permissions → all permissions with metadata, ordered by sortOrder.
 */
@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'List the global permission catalog with metadata' })
  @ApiResponse({ status: 200, description: 'Permission catalog ordered by sortOrder' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing role.read' })
  async list() {
    const permissions = await this.permissionRepository.getAllPermissions();
    return successResponse(permissions);
  }
}
