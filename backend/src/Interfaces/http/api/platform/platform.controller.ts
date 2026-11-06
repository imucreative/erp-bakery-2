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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformRepository } from '../../../../Domains/platform/PlatformRepository';
import { CreateUserUseCase } from '../../../../Applications/use_case/users/CreateUserUseCase';
import { GetUser } from '../../decorators/get-user.decorator';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { SuperAdminOnly } from '../../decorators/super-admin-only.decorator';
import { listResponse } from '../../../../Commons/helpers/response.helper';
import { PlatformUserQueryDto } from './dto/platform-user-query.dto';
import { PlatformCreateUserDto } from './dto/platform-create-user.dto';
import { PlatformUpdateUserDto } from './dto/platform-update-user.dto';

/**
 * PlatformController
 *
 * Cross-tenant identity and access endpoints for the platform console.
 *
 * GET /api/v1/platform/users → list users across all companies
 */
@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformRepository: PlatformRepository,
    private readonly createUserUseCase: CreateUserUseCase,
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
  @ApiOperation({ summary: 'List assignable roles for a company' })
  async listRoles(@Param('companyId') companyId: string) {
    return { success: true, data: await this.platformRepository.listRoles(companyId) };
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Create a user and assign it to a company' })
  async createUser(
    @Body() dto: PlatformCreateUserDto,
    @GetUser() actor: JwtAccessPayload,
  ) {
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
}
