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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UomDimensionRepository } from '../../../../Domains/uom-dimensions/UomDimensionRepository';
import { CreateUomDimensionUseCase } from '../../../../Applications/use_case/uom-dimensions/CreateUomDimensionUseCase';
import { UpdateUomDimensionUseCase } from '../../../../Applications/use_case/uom-dimensions/UpdateUomDimensionUseCase';
import { DeleteUomDimensionUseCase } from '../../../../Applications/use_case/uom-dimensions/DeleteUomDimensionUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateUomDimensionDto } from './dto/create-uom-dimension.dto';
import { UpdateUomDimensionDto } from './dto/update-uom-dimension.dto';
import { UomDimensionQueryDto } from './dto/uom-dimension-query.dto';

/**
 * UomDimensionController
 *
 * Global UOM dimension reference data. Creating a dimension also creates its
 * canonical (factor 1) UOM for the caller's company, so every dimension has a
 * smallest unit before other units are added.
 *
 * GET    /api/v1/uom-dimensions               → active list (or all)
 * GET    /api/v1/uom-dimensions/:code         → detail
 * POST   /api/v1/uom-dimensions               → create (+ canonical UOM)
 * PUT    /api/v1/uom-dimensions/:code         → update (code/canonical immutable)
 * DELETE /api/v1/uom-dimensions/:code         → hard-delete (409 when in use)
 */
@ApiTags('UOM Dimensions')
@ApiBearerAuth()
@Controller('uom-dimensions')
export class UomDimensionController {
  constructor(
    private readonly createUomDimensionUseCase: CreateUomDimensionUseCase,
    private readonly updateUomDimensionUseCase: UpdateUomDimensionUseCase,
    private readonly deleteUomDimensionUseCase: DeleteUomDimensionUseCase,
    private readonly uomDimensionRepository: UomDimensionRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.read')
  @ApiOperation({ summary: 'List UOM dimensions' })
  @ApiResponse({ status: 200, description: 'Dimensions ordered for display' })
  async list(@Query() query: UomDimensionQueryDto) {
    const dimensions =
      query.includeInactive === 'true'
        ? await this.uomDimensionRepository.listAll()
        : await this.uomDimensionRepository.listActive();
    return successResponse(dimensions);
  }

  @Get(':code')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.read')
  @ApiOperation({ summary: 'Get one UOM dimension by code' })
  @ApiParam({ name: 'code', description: 'Dimension code' })
  @ApiResponse({ status: 200, description: 'Dimension data' })
  @ApiResponse({ status: 404, description: 'Dimension not found' })
  async getByCode(@Param('code') code: string) {
    const dimension = await this.uomDimensionRepository.getByCode(code);
    return successResponse(dimension);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('uom.manage')
  @ApiOperation({ summary: 'Create a dimension and its canonical (smallest) UOM' })
  @ApiResponse({ status: 201, description: 'Dimension created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Code already used' })
  async create(@Body() dto: CreateUomDimensionDto, @GetUser() user: JwtAccessPayload) {
    const dimension = await this.createUomDimensionUseCase.execute(dto, this._companyId(user));
    return successResponse(dimension);
  }

  @Put(':code')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.manage')
  @ApiOperation({ summary: 'Update a dimension (code/canonical unit are immutable)' })
  @ApiParam({ name: 'code', description: 'Dimension code' })
  @ApiResponse({ status: 200, description: 'Dimension updated' })
  @ApiResponse({ status: 404, description: 'Dimension not found' })
  async update(@Param('code') code: string, @Body() dto: UpdateUomDimensionDto) {
    const dimension = await this.updateUomDimensionUseCase.execute(code, dto);
    return successResponse(dimension);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('uom.manage')
  @ApiOperation({ summary: 'Delete a dimension' })
  @ApiParam({ name: 'code', description: 'Dimension code' })
  @ApiResponse({ status: 200, description: 'Dimension deleted' })
  @ApiResponse({ status: 404, description: 'Dimension not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot delete; deactivate instead' })
  async delete(@Param('code') code: string) {
    await this.deleteUomDimensionUseCase.execute(code);
    return successResponse(null);
  }
}
