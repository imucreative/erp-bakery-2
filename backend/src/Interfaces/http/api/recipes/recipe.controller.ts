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
import { CreateRecipeUseCase } from '../../../../Applications/use_case/recipes/CreateRecipeUseCase';
import { UpdateRecipeUseCase } from '../../../../Applications/use_case/recipes/UpdateRecipeUseCase';
import { ActivateRecipeUseCase } from '../../../../Applications/use_case/recipes/ActivateRecipeUseCase';
import { ArchiveRecipeUseCase } from '../../../../Applications/use_case/recipes/ArchiveRecipeUseCase';
import { DeleteRecipeUseCase } from '../../../../Applications/use_case/recipes/DeleteRecipeUseCase';
import { GetRecipesUseCase } from '../../../../Applications/use_case/recipes/GetRecipesUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeQueryDto } from './dto/recipe-query.dto';

/**
 * RecipeController — Bill of Materials (recipes).
 * Company-scoped; permission-guarded (recipe.read / recipe.manage).
 *
 * GET   /production/recipes              list
 * GET   /production/recipes/:id          detail
 * POST  /production/recipes              create draft
 * PUT   /production/recipes/:id          update draft
 * POST  /production/recipes/:id/activate DRAFT -> ACTIVE (one active per product)
 * POST  /production/recipes/:id/archive  -> ARCHIVED
 * DELETE /production/recipes/:id         soft-delete DRAFT only
 */
@ApiTags('Recipes')
@ApiBearerAuth()
@Controller('production/recipes')
export class RecipeController {
  constructor(
    private readonly createUseCase: CreateRecipeUseCase,
    private readonly updateUseCase: UpdateRecipeUseCase,
    private readonly activateUseCase: ActivateRecipeUseCase,
    private readonly archiveUseCase: ArchiveRecipeUseCase,
    private readonly deleteUseCase: DeleteRecipeUseCase,
    private readonly getUseCase: GetRecipesUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('recipe.read')
  @ApiOperation({ summary: 'List recipes' })
  @ApiResponse({ status: 200, description: 'Paginated recipe list' })
  async list(@Query() query: RecipeQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getUseCase.list(
      { limit, offset, productId: query.productId, status: query.status, search: query.search },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('recipe.read')
  @ApiOperation({ summary: 'Get a recipe by ID' })
  @ApiParam({ name: 'id', description: 'Recipe UUID' })
  @ApiResponse({ status: 200, description: 'Recipe detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const recipe = await this.getUseCase.detail(id, this._companyId(user));
    return successResponse(recipe);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('recipe.manage')
  @ApiOperation({ summary: 'Create a recipe draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateRecipeDto, @GetUser() user: JwtAccessPayload) {
    const recipe = await this.createUseCase.execute(dto, this._companyId(user));
    return successResponse(recipe);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('recipe.manage')
  @ApiOperation({ summary: 'Update a recipe draft (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Recipe UUID' })
  @ApiResponse({ status: 200, description: 'Draft updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const recipe = await this.updateUseCase.execute(id, dto, this._companyId(user));
    return successResponse(recipe);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('recipe.manage')
  @ApiOperation({ summary: 'Activate a recipe (DRAFT -> ACTIVE, one active per product)' })
  @ApiParam({ name: 'id', description: 'Recipe UUID' })
  @ApiResponse({ status: 200, description: 'Activated' })
  @ApiResponse({ status: 409, description: 'Another active recipe exists for the product' })
  async activate(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const recipe = await this.activateUseCase.execute(id, this._companyId(user));
    return successResponse(recipe);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('recipe.manage')
  @ApiOperation({ summary: 'Archive a recipe (DRAFT/ACTIVE -> ARCHIVED)' })
  @ApiParam({ name: 'id', description: 'Recipe UUID' })
  @ApiResponse({ status: 200, description: 'Archived' })
  async archive(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const recipe = await this.archiveUseCase.execute(id, this._companyId(user));
    return successResponse(recipe);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('recipe.manage')
  @ApiOperation({ summary: 'Delete a recipe (soft-delete, DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Recipe UUID' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 400, description: 'Recipe is not DRAFT (only DRAFT is deletable)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    await this.deleteUseCase.execute(id, this._companyId(user));
    return successResponse({ id });
  }
}
