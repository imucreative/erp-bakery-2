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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PlatformRepository } from '../../../../Domains/platform/PlatformRepository';
import { CompanyRepository } from '../../../../Domains/companies/CompanyRepository';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { PermissionRepository } from '../../../../Domains/permissions/PermissionRepository';
import { CreateUserUseCase } from '../../../../Applications/use_case/users/CreateUserUseCase';
import { CreateRoleUseCase } from '../../../../Applications/use_case/roles/CreateRoleUseCase';
import { UpdateRoleUseCase } from '../../../../Applications/use_case/roles/UpdateRoleUseCase';
import { DeleteRoleUseCase } from '../../../../Applications/use_case/roles/DeleteRoleUseCase';
import { GetUser } from '../../decorators/get-user.decorator';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { SuperAdminOnly } from '../../decorators/super-admin-only.decorator';
import { listResponse, successResponse } from '../../../../Commons/helpers/response.helper';
import { NotFoundError } from '../../../../Commons/exceptions/NotFoundError';
import { PlatformUserQueryDto } from './dto/platform-user-query.dto';
import { PlatformCreateUserDto } from './dto/platform-create-user.dto';
import { PlatformUpdateUserDto } from './dto/platform-update-user.dto';
import { CreateRoleDto } from '../roles/dto/create-role.dto';
import { UpdateRoleDto } from '../roles/dto/update-role.dto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_AUDIT_MODULE = 'platform_roles';

/**
 * PlatformController
 *
 * Cross-tenant identity and access endpoints for the platform console.
 *
 * GET    /api/v1/platform/users                                  → list users across all companies
 * GET    /api/v1/platform/companies/:companyId/roles             → list company roles with usage
 * GET    /api/v1/platform/companies/:companyId/roles/:roleId     → role detail + permissions
 * POST   /api/v1/platform/companies/:companyId/roles             → create a company role
 * PUT    /api/v1/platform/companies/:companyId/roles/:roleId     → update a company role
 * DELETE /api/v1/platform/companies/:companyId/roles/:roleId     → delete a company role
 * GET    /api/v1/platform/permissions                            → global permission catalog
 */
@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformRepository: PlatformRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

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

  @Get('companies/:companyId/roles')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'List company roles with active-user counts' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company role list' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async listRoles(@Param('companyId') companyId: string) {
    await this._assertCompanyExists(companyId);
    return successResponse(await this.platformRepository.listRoles(companyId));
  }

  @Get('companies/:companyId/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Get a company role with its permission codes' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role detail with permission codes' })
  @ApiResponse({ status: 404, description: 'Company or role not found' })
  async getRole(@Param('companyId') companyId: string, @Param('roleId') roleId: string) {
    this._assertUuid(roleId, 'ROLE.NOT_FOUND');
    await this._assertCompanyExists(companyId);

    const role = await this.roleRepository.getRoleByIdAndCompany(roleId, companyId);
    const permissions = await this.roleRepository.getRolePermissions(role.id);
    return successResponse({ ...role, permissions });
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'List the global permission catalog' })
  @ApiResponse({ status: 200, description: 'Permission catalog ordered by sortOrder' })
  async listPermissions() {
    return successResponse(await this.permissionRepository.getAllPermissions());
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Create a user and assign it to a company' })
  async createUser(@Body() dto: PlatformCreateUserDto, @GetUser() actor: JwtAccessPayload) {
    const created = await this.createUserUseCase.execute(dto, dto.companyId);
    await this.platformRepository.recordAudit(
      actor.sub,
      'CREATE',
      created.id,
      dto.companyId,
      null,
      { name: created.name, email: created.email, roleId: dto.roleId },
    );
    return { success: true, data: created };
  }

  @Put('users/:id')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Edit a platform user, including company and role assignment' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: PlatformUpdateUserDto,
    @GetUser() actor: JwtAccessPayload,
  ) {
    const updated = await this.platformRepository.updateUser(id, dto, actor.sub);
    return { success: true, data: updated };
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Soft-delete a platform user' })
  async deleteUser(@Param('id') id: string, @GetUser() actor: JwtAccessPayload) {
    await this.platformRepository.softDeleteUser(id, actor.sub);
    return { success: true, data: null };
  }

  @Post('companies/:companyId/roles')
  @HttpCode(HttpStatus.CREATED)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Create a company role with its initial permission set' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiResponse({ status: 201, description: 'Role created with its permission set' })
  @ApiResponse({ status: 400, description: 'Validation error / reserved permission code' })
  @ApiResponse({ status: 409, description: 'Role code already used in this company' })
  async createRole(
    @Param('companyId') companyId: string,
    @Body() dto: CreateRoleDto,
    @GetUser() actor: JwtAccessPayload,
  ) {
    await this._assertCompanyExists(companyId);

    const created = await this.createRoleUseCase.execute(dto, companyId);
    await this.platformRepository.recordAudit(
      actor.sub,
      'CREATE',
      created.id,
      companyId,
      null,
      { code: created.code, name: created.name, permissions: created.permissions },
      ROLE_AUDIT_MODULE,
    );
    return successResponse(created);
  }

  @Put('companies/:companyId/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Update a company role and full-sync its permissions' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role updated with its permission set' })
  @ApiResponse({ status: 400, description: 'Validation error / reserved permission code' })
  @ApiResponse({ status: 404, description: 'Company or role not found' })
  async updateRole(
    @Param('companyId') companyId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @GetUser() actor: JwtAccessPayload,
  ) {
    this._assertUuid(roleId, 'ROLE.NOT_FOUND');
    await this._assertCompanyExists(companyId);

    // Snapshot before the mutation for the audit trail.
    const before = await this.roleRepository.getRoleByIdAndCompany(roleId, companyId);
    const beforePermissions = await this.roleRepository.getRolePermissions(roleId);

    const updated = await this.updateRoleUseCase.execute(roleId, dto, companyId);
    await this.platformRepository.recordAudit(
      actor.sub,
      'UPDATE',
      roleId,
      companyId,
      { name: before.name, description: before.description, permissions: beforePermissions },
      {
        name: updated.name,
        description: updated.description,
        permissions: updated.permissions,
      },
      ROLE_AUDIT_MODULE,
    );
    return successResponse(updated);
  }

  @Delete('companies/:companyId/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Delete a company role' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Company or role not found' })
  @ApiResponse({ status: 409, description: 'OWNER role or role still in use' })
  async deleteRole(
    @Param('companyId') companyId: string,
    @Param('roleId') roleId: string,
    @GetUser() actor: JwtAccessPayload,
  ) {
    this._assertUuid(roleId, 'ROLE.NOT_FOUND');
    await this._assertCompanyExists(companyId);

    const before = await this.roleRepository.getRoleByIdAndCompany(roleId, companyId);
    const beforePermissions = await this.roleRepository.getRolePermissions(roleId);

    await this.deleteRoleUseCase.execute(roleId, companyId);
    await this.platformRepository.recordAudit(
      actor.sub,
      'DELETE',
      roleId,
      companyId,
      {
        code: before.code,
        name: before.name,
        description: before.description,
        permissions: beforePermissions,
      },
      null,
      ROLE_AUDIT_MODULE,
    );
    return successResponse(null);
  }

  private _assertUuid(value: string, errorCode: string): void {
    if (!UUID_PATTERN.test(value)) {
      throw new NotFoundError(errorCode);
    }
  }

  private async _assertCompanyExists(companyId: string): Promise<void> {
    this._assertUuid(companyId, 'COMPANY.NOT_FOUND');
    await this.companyRepository.getCompanyById(companyId);
  }
}
