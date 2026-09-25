import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';

/**
 * RoleController
 *
 * Read-only, tenant-scoped view of the roles defined for the acting user's company.
 *
 * GET /api/v1/roles       → list roles for the current company
 * GET /api/v1/roles/:id   → role detail including its permission codes
 */
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleRepository: RoleRepository) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'List roles for the current company' })
  @ApiResponse({ status: 200, description: 'Role list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing role.read' })
  async list(@GetUser() user: JwtAccessPayload) {
    const roles = await this.roleRepository.getRolesByCompanyId(this._companyId(user));
    return successResponse(roles);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Get a role with its permissions' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role detail with permission codes' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const role = await this.roleRepository.getRoleByIdAndCompany(id, companyId);
    const permissions = await this.roleRepository.getRolePermissions(role.id);
    return successResponse({ ...role, permissions });
  }
}
