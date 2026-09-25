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
import { CreateUomUseCase } from '../../../../Applications/use_case/uoms/CreateUomUseCase';
import { UpdateUomUseCase } from '../../../../Applications/use_case/uoms/UpdateUomUseCase';
import { DeleteUomUseCase } from '../../../../Applications/use_case/uoms/DeleteUomUseCase';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomQueryDto } from './dto/uom-query.dto';

/**
 * UomController
 *
 * Tenant-scoped CRUD for units of measure. Requires uom.read / uom.manage.
 *
 * POST   /api/v1/uoms       → create
 * GET    /api/v1/uoms       → list (paginated, search, isActive)
 * GET    /api/v1/uoms/:id   → detail
 * PUT    /api/v1/uoms/:id   → update
 * DELETE /api/v1/uoms/:id   → soft-delete (blocked when in use → 409)
 */
@ApiTags('UOM')
@ApiBearerAuth()
@Controller('uoms')
export class UomController {
  constructor(
    private readonly createUomUseCase: CreateUomUseCase,
    private readonly updateUomUseCase: UpdateUomUseCase,
    private readonly deleteUomUseCase: DeleteUomUseCase,
    private readonly uomRepository: UomRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('uom.manage')
  @ApiOperation({ summary: 'Create a new unit of measure for the current company' })
  @ApiResponse({ status: 201, description: 'UOM created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing uom.manage' })
  async create(@Body() dto: CreateUomDto, @GetUser() user: JwtAccessPayload) {
    const uom = await this.createUomUseCase.execute(dto, this._companyId(user));
    return successResponse(uom);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.read')
  @ApiOperation({ summary: 'List units of measure for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated UOM list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing uom.read' })
  async list(@Query() query: UomQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.uomRepository.getUomsByCompany(companyId, {
      limit,
      offset,
      search: query.search,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });

    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.read')
  @ApiOperation({ summary: 'Get a single unit of measure by ID' })
  @ApiParam({ name: 'id', description: 'UOM UUID' })
  @ApiResponse({ status: 200, description: 'UOM data' })
  @ApiResponse({ status: 404, description: 'UOM not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const uom = await this.uomRepository.getUomById(id, this._companyId(user));
    return successResponse(uom);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.manage')
  @ApiOperation({ summary: 'Update a unit of measure' })
  @ApiParam({ name: 'id', description: 'UOM UUID' })
  @ApiResponse({ status: 200, description: 'UOM updated' })
  @ApiResponse({ status: 404, description: 'UOM not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot deactivate' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUomDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const uom = await this.updateUomUseCase.execute(id, dto, this._companyId(user));
    return successResponse(uom);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.manage')
  @ApiOperation({ summary: 'Soft-delete a unit of measure' })
  @ApiParam({ name: 'id', description: 'UOM UUID' })
  @ApiResponse({ status: 200, description: 'UOM deleted' })
  @ApiResponse({ status: 404, description: 'UOM not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot delete' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteUomUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
