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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserUseCase } from '../../../../Applications/use_case/users/CreateUserUseCase';
import { UpdateUserUseCase } from '../../../../Applications/use_case/users/UpdateUserUseCase';
import { UserRepository } from '../../../../Domains/users/UserRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

/**
 * UserController
 *
 * Tenant-scoped user management: invite users, assign a role, assign outlets.
 *
 * POST   /api/v1/users       → create/invite a user
 * GET    /api/v1/users       → list users (paginated, search, role/active filters)
 * GET    /api/v1/users/:id   → user detail with role + outlets
 * PUT    /api/v1/users/:id   → update user / reassign role & outlets
 * DELETE /api/v1/users/:id   → soft-delete user
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly userRepository: UserRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('user.manage')
  @ApiOperation({ summary: 'Invite/create a user in the current company' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing user.manage' })
  @ApiResponse({ status: 409, description: 'Email already used' })
  async create(@Body() dto: CreateUserDto, @GetUser() user: JwtAccessPayload) {
    const created = await this.createUserUseCase.execute(dto, this._companyId(user));
    return successResponse(created);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'List users for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing user.read' })
  async list(@Query() query: UserQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.userRepository.getUsersByCompany(companyId, {
      limit,
      offset,
      search: query.search,
      roleId: query.roleId,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });

    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Get a user with role and outlet assignments' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User detail' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const detail = await this.userRepository.getUserDetail(id, this._companyId(user));
    return successResponse(detail);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('user.manage')
  @ApiOperation({ summary: 'Update a user, reassign role or outlets' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const updated = await this.updateUserUseCase.execute(id, dto, this._companyId(user));
    return successResponse(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('user.manage')
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.userRepository.softDeleteUser(id, this._companyId(user));
    return successResponse(null);
  }
}
