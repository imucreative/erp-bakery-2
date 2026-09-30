import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { CreateRoleUseCase } from '../../../../Applications/use_case/roles/CreateRoleUseCase';
import { UpdateRoleUseCase } from '../../../../Applications/use_case/roles/UpdateRoleUseCase';
import { DeleteRoleUseCase } from '../../../../Applications/use_case/roles/DeleteRoleUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/**
 * RoleController
 *
 * Tenant-scoped Dynamic Role Management (ADR 49). Read requires role.read;
 * every write requires role.manage. All operations are company-scoped —
 * platform roles (company_id NULL / SUPER_ADMIN) never appear in the list and
 * cannot be mutated through these endpoints.
 *
 * GET    /api/v1/roles       → list roles for the current company
 * GET    /api/v1/roles/:id   → role detail including its permission codes
 * POST   /api/v1/roles       → create role + assign initial permission set
 * PUT    /api/v1/roles/:id   → update name/description + full-sync permissions
 * DELETE /api/v1/roles/:id   → delete role (blocked for OWNER / in-use → 409)
 */
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Create a new role for the current company' })
  @ApiResponse({ status: 201, description: 'Role created with its permission set' })
  @ApiResponse({ status: 400, description: 'Validation error / unknown permission code' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing role.manage' })
  @ApiResponse({ status: 409, description: 'Role code already used in this company' })
  async create(@Body() dto: CreateRoleDto, @GetUser() user: JwtAccessPayload) {
    const role = await this.createRoleUseCase.execute(dto, this._companyId(user));
    return successResponse(role);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Update a role (name/description + full-sync permissions)' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role updated with its permission set' })
  @ApiResponse({ status: 400, description: 'Validation error / unknown permission code' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const role = await this.updateRoleUseCase.execute(id, dto, this._companyId(user));
    return successResponse(role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('role.manage')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'OWNER role or role still in use' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteRoleUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
