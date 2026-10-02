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
import { CreateOutletUseCase } from '../../../../Applications/use_case/outlets/CreateOutletUseCase';
import { UpdateOutletUseCase } from '../../../../Applications/use_case/outlets/UpdateOutletUseCase';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { OutletQueryDto } from './dto/outlet-query.dto';

/**
 * OutletController
 *
 * All routes are tenant-scoped: the acting user's companyId (from the JWT)
 * determines which outlets are visible/mutable. Requires outlet.read / outlet.manage.
 *
 * POST   /api/v1/outlets       → create outlet
 * GET    /api/v1/outlets       → list outlets (paginated, search, isActive filter)
 * GET    /api/v1/outlets/:id   → get one outlet
 * PUT    /api/v1/outlets/:id   → update outlet
 * DELETE /api/v1/outlets/:id   → soft-delete outlet
 */
@ApiTags('Outlets')
@ApiBearerAuth()
@Controller('outlets')
export class OutletController {
  constructor(
    private readonly createOutletUseCase: CreateOutletUseCase,
    private readonly updateOutletUseCase: UpdateOutletUseCase,
    private readonly outletRepository: OutletRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('outlet.manage')
  @ApiOperation({ summary: 'Create a new outlet for the current company' })
  @ApiResponse({ status: 201, description: 'Outlet created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing outlet.manage' })
  async create(@Body() dto: CreateOutletDto, @GetUser() user: JwtAccessPayload) {
    const outlet = await this.createOutletUseCase.execute(dto, this._companyId(user));
    return successResponse(outlet);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('outlet.read')
  @ApiOperation({ summary: 'List outlets for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated outlet list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing outlet.read' })
  async list(@Query() query: OutletQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.outletRepository.getOutletsByCompany(companyId, {
      limit,
      offset,
      search: query.search,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });

    return listResponse(rows, total, page, limit);
  }

  @Get('accessible')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List outlets the current user may operate in',
    description:
      'Returns the outlets accessible to the authenticated user within their active company. ' +
      'OWNER / super-admin get every non-deleted outlet of the company; other users get only ' +
      'their ACTIVE user_outlets assignments. Authentication only — no outlet.read required, ' +
      'so operational roles (e.g. cashier, production) can resolve their own outlets.',
  })
  @ApiResponse({ status: 200, description: 'Accessible outlet list' })
  async accessible(@GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const allOutlets = user.isSuperAdmin || user.roleCode === 'OWNER';
    const outlets = await this.outletRepository.findAccessibleByUser(
      user.sub,
      companyId,
      allOutlets,
    );
    return successResponse(outlets);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('outlet.read')
  @ApiOperation({ summary: 'Get a single outlet by ID' })
  @ApiParam({ name: 'id', description: 'Outlet UUID' })
  @ApiResponse({ status: 200, description: 'Outlet data' })
  @ApiResponse({ status: 404, description: 'Outlet not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const outlet = await this.outletRepository.getOutletById(id, this._companyId(user));
    return successResponse(outlet);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('outlet.manage')
  @ApiOperation({ summary: 'Update an outlet' })
  @ApiParam({ name: 'id', description: 'Outlet UUID' })
  @ApiResponse({ status: 200, description: 'Outlet updated' })
  @ApiResponse({ status: 404, description: 'Outlet not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOutletDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const outlet = await this.updateOutletUseCase.execute(id, dto, this._companyId(user));
    return successResponse(outlet);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('outlet.manage')
  @ApiOperation({ summary: 'Soft-delete an outlet' })
  @ApiParam({ name: 'id', description: 'Outlet UUID' })
  @ApiResponse({ status: 200, description: 'Outlet deleted' })
  @ApiResponse({ status: 404, description: 'Outlet not found' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.outletRepository.softDeleteOutlet(id, this._companyId(user));
    return successResponse(null);
  }
}
