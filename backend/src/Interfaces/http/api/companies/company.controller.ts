import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RegisterCompanyUseCase } from '../../../../Applications/use_case/companies/RegisterCompanyUseCase';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { Public } from '../../decorators/public.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { successResponse } from '../../../../Commons/helpers/response.helper';
import { CompanyRepository } from '../../../../Domains/companies/CompanyRepository';

/**
 * CompanyController
 *
 * POST /api/v1/companies/register  → SaaS self-service company registration (public)
 * GET  /api/v1/companies/me        → get current user's company (authenticated)
 * GET  /api/v1/companies/:id       → get company by id (SUPER_ADMIN or company.read)
 */
@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly registerCompanyUseCase: RegisterCompanyUseCase,
    private readonly companyRepository: CompanyRepository,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new company (SaaS tenant self-service)',
    description:
      'Creates a new company, seeds default roles (OWNER, SUPERVISOR_OUTLET, ADMIN_GUDANG, PRODUKSI, KASIR), and registers the owner account.',
  })
  @ApiResponse({
    status: 201,
    description: 'Company registered successfully',
    schema: {
      example: {
        success: true,
        data: {
          company: {
            id: 'uuid',
            code: 'COMP-001',
            name: 'Toko Roti Makmur',
            slug: 'toko-roti-makmur',
          },
          owner: {
            id: 'uuid',
            name: 'Budi Santoso',
            email: 'budi@rotimakmur.com',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Slug or email already used' })
  async register(@Body() dto: RegisterCompanyDto) {
    const result = await this.registerCompanyUseCase.execute(dto);
    return successResponse(result);
  }

  @ApiBearerAuth()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current user's company profile" })
  @ApiResponse({
    status: 200,
    description: 'Company profile',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          code: 'COMP-001',
          name: 'Toko Roti Makmur',
          slug: 'toko-roti-makmur',
          address: null,
          phone: null,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getMyCompany(@GetUser() user: JwtAccessPayload) {
    if (!user.companyId) {
      return successResponse(null);
    }
    const company = await this.companyRepository.getCompanyById(user.companyId);
    return successResponse(company);
  }

  @ApiBearerAuth()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('company.read')
  @ApiOperation({ summary: 'Get company by ID (requires company.read permission)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({
    status: 200,
    description: 'Company data',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          code: 'COMP-001',
          name: 'Toko Roti Makmur',
          slug: 'toko-roti-makmur',
          address: null,
          phone: null,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — missing company.read permission' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getById(@Param('id') id: string) {
    const company = await this.companyRepository.getCompanyById(id);
    return successResponse(company);
  }
}
