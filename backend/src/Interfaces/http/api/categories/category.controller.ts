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
import { CreateCategoryUseCase } from '../../../../Applications/use_case/categories/CreateCategoryUseCase';
import { UpdateCategoryUseCase } from '../../../../Applications/use_case/categories/UpdateCategoryUseCase';
import { DeleteCategoryUseCase } from '../../../../Applications/use_case/categories/DeleteCategoryUseCase';
import { CategoryRepository } from '../../../../Domains/categories/CategoryRepository';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

/**
 * CategoryController
 *
 * Tenant-scoped CRUD for product categories. Requires category.read / category.manage.
 *
 * POST   /api/v1/categories       → create
 * GET    /api/v1/categories       → list (paginated, search, isActive, productGroupId)
 * GET    /api/v1/categories/:id   → detail
 * PUT    /api/v1/categories/:id   → update
 * DELETE /api/v1/categories/:id   → soft-delete (blocked when in use → 409)
 */
@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('category.manage')
  @ApiOperation({ summary: 'Create a new product category for the current company' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing category.manage' })
  async create(@Body() dto: CreateCategoryDto, @GetUser() user: JwtAccessPayload) {
    const category = await this.createCategoryUseCase.execute(dto, this._companyId(user));
    return successResponse(category);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('category.read')
  @ApiOperation({ summary: 'List product categories for the current company' })
  @ApiResponse({ status: 200, description: 'Paginated category list' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing category.read' })
  async list(@Query() query: CategoryQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);

    const { rows, total } = await this.categoryRepository.getCategoriesByCompany(companyId, {
      limit,
      offset,
      search: query.search,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
      productGroupId: query.productGroupId,
    });

    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('category.read')
  @ApiOperation({ summary: 'Get a single product category by ID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category data' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getById(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const category = await this.categoryRepository.getCategoryById(id, this._companyId(user));
    return successResponse(category);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('category.manage')
  @ApiOperation({ summary: 'Update a product category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot deactivate' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const category = await this.updateCategoryUseCase.execute(id, dto, this._companyId(user));
    return successResponse(category);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('category.manage')
  @ApiOperation({ summary: 'Soft-delete a product category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'In use — cannot delete' })
  async delete(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteCategoryUseCase.execute(id, this._companyId(user));
    return successResponse(null);
  }
}
