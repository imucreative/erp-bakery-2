import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginUseCase } from '../../../../Applications/use_case/auth/LoginUseCase';
import { RefreshTokenUseCase } from '../../../../Applications/use_case/auth/RefreshTokenUseCase';
import { LogoutUseCase } from '../../../../Applications/use_case/auth/LogoutUseCase';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public } from '../../decorators/public.decorator';
import { successResponse } from '../../../../Commons/helpers/response.helper';

/**
 * AuthController
 * Mirrors sample-be AuthenticationsHandler pattern.
 *
 * POST   /api/v1/auth/login    → login, returns access + refresh token
 * PUT    /api/v1/auth/refresh  → exchange refresh token for new access token
 * DELETE /api/v1/auth/logout   → revoke refresh token
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful — returns access and refresh token',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGci...',
          refreshToken: 'eyJhbGci...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const result = await this.loginUseCase.execute(dto);
    return successResponse({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Public()
  @Put('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token issued',
    schema: {
      example: {
        success: true,
        data: { accessToken: 'eyJhbGci...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Missing or invalid refresh token payload' })
  @ApiResponse({ status: 401, description: 'Refresh token not found or expired' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const accessToken = await this.refreshTokenUseCase.execute(dto);
    return successResponse({ accessToken });
  }

  @ApiBearerAuth()
  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: { example: { success: true, data: null } },
  })
  @ApiResponse({ status: 401, description: 'Refresh token not found' })
  async logout(@Body() dto: LogoutDto) {
    await this.logoutUseCase.execute(dto);
    return successResponse(null);
  }
}
