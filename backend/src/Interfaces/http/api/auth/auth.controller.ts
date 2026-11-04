import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { InMemoryRateLimiter } from '../../../../Infrastructures/security/InMemoryRateLimiter';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginUseCase } from '../../../../Applications/use_case/auth/LoginUseCase';
import { RefreshTokenUseCase } from '../../../../Applications/use_case/auth/RefreshTokenUseCase';
import { LogoutUseCase } from '../../../../Applications/use_case/auth/LogoutUseCase';
import {
  SetupTwoFactorUseCase,
  EnableTwoFactorUseCase,
  DisableTwoFactorUseCase,
  VerifyTwoFactorLoginUseCase,
} from '../../../../Applications/use_case/auth/TwoFactorUseCases';
import { UserRepository } from '../../../../Domains/users/UserRepository';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { Public } from '../../decorators/public.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { successResponse } from '../../../../Commons/helpers/response.helper';

/**
 * AuthController
 *
 * POST   /api/v1/auth/login        → password step; returns tokens OR an MFA challenge
 * POST   /api/v1/auth/mfa/verify   → second step: mfaToken + TOTP/recovery code → tokens
 * PUT    /api/v1/auth/refresh      → exchange refresh token for new access token
 * DELETE /api/v1/auth/logout       → revoke refresh token
 * GET    /api/v1/auth/2fa/status   → 2FA state for the current user
 * POST   /api/v1/auth/2fa/setup    → start TOTP enrollment (secret + recovery codes)
 * POST   /api/v1/auth/2fa/enable   → confirm enrollment with a valid code
 * POST   /api/v1/auth/2fa/disable  → turn 2FA off (requires a valid code)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly setupTwoFactorUseCase: SetupTwoFactorUseCase,
    private readonly enableTwoFactorUseCase: EnableTwoFactorUseCase,
    private readonly disableTwoFactorUseCase: DisableTwoFactorUseCase,
    private readonly verifyTwoFactorLoginUseCase: VerifyTwoFactorLoginUseCase,
    private readonly userRepository: UserRepository,
    private readonly rateLimiter: InMemoryRateLimiter,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description:
      'Returns access + refresh token, or (when 2FA is enabled) an MFA challenge',
    schema: {
      example: {
        success: true,
        data: {
          mfaRequired: false,
          accessToken: 'eyJhbGci...',
          refreshToken: 'eyJhbGci...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() request: FastifyRequest) {
    // Brute-force guard: 10 attempts per minute per IP.
    this.rateLimiter.consumeOrThrow(`auth:login:${request.ip}`, 10, 60_000);
    const result = await this.loginUseCase.execute(dto);
    return successResponse(result);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with a TOTP or recovery code' })
  @ApiResponse({
    status: 200,
    description: 'MFA verified — returns access and refresh token',
    schema: {
      example: {
        success: true,
        data: { accessToken: 'eyJhbGci...', refreshToken: 'eyJhbGci...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'MFA token or code invalid/expired' })
  async verifyMfa(@Body() dto: VerifyMfaDto, @Req() request: FastifyRequest) {
    // 6-digit codes are guessable: 5 attempts per minute per IP, reset on success.
    const key = `auth:mfa-verify:${request.ip}`;
    this.rateLimiter.consumeOrThrow(key, 5, 60_000);
    const result = await this.verifyTwoFactorLoginUseCase.execute(dto);
    this.rateLimiter.reset(key);
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

  @ApiBearerAuth()
  @Get('2fa/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Current 2FA state (enabled / pending enrollment)' })
  @ApiResponse({
    status: 200,
    description: '2FA state',
    schema: { example: { success: true, data: { enabled: false, pending: false } } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async twoFactorStatus(@GetUser() user: JwtAccessPayload) {
    const state = await this.userRepository.getTwoFactorStateById(user.sub);
    return successResponse({
      enabled: state.enabled,
      pending: !state.enabled && state.secretCipher !== null,
    });
  }

  @ApiBearerAuth()
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start TOTP enrollment — returns the secret, otpauth URI and recovery codes',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment started (2FA is NOT enabled until /2fa/enable succeeds)',
    schema: {
      example: {
        success: true,
        data: {
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUri: 'otpauth://totp/...',
          recoveryCodes: ['ABCDE-FGHIJ'],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setupTwoFactor(@GetUser() user: JwtAccessPayload) {
    const result = await this.setupTwoFactorUseCase.execute(user.sub);
    return successResponse(result);
  }

  @ApiBearerAuth()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm TOTP enrollment with a valid code' })
  @ApiResponse({
    status: 200,
    description: '2FA enabled',
    schema: { example: { success: true, data: null } },
  })
  @ApiResponse({ status: 401, description: 'Code invalid, or setup not started' })
  async enableTwoFactor(@GetUser() user: JwtAccessPayload, @Body() dto: TwoFactorCodeDto) {
    await this.enableTwoFactorUseCase.execute(user.sub, dto.code);
    return successResponse(null);
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA (requires a valid current code)' })
  @ApiResponse({
    status: 200,
    description: '2FA disabled',
    schema: { example: { success: true, data: null } },
  })
  @ApiResponse({ status: 401, description: 'Code invalid, or 2FA not enabled' })
  async disableTwoFactor(@GetUser() user: JwtAccessPayload, @Body() dto: TwoFactorCodeDto) {
    await this.disableTwoFactorUseCase.execute(user.sub, dto.code);
    return successResponse(null);
  }
}
