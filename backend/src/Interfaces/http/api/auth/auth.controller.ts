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
import {
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
} from '../../../../Applications/use_case/auth/PasswordResetUseCases';
import { ChangePasswordUseCase } from '../../../../Applications/use_case/auth/ChangePasswordUseCase';
import { UserRepository } from '../../../../Domains/users/UserRepository';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
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
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Selalu membalas 200 — tidak pernah memberi tahu apakah email terdaftar atau tidak ' +
      '(mencegah enumerasi akun).',
  })
  @ApiResponse({ status: 200, description: 'Permintaan diterima' })
  @ApiResponse({ status: 429, description: 'Terlalu banyak permintaan' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: FastifyRequest) {
    // 5 permintaan / 15 menit per IP, dan 3 / 15 menit per email supaya satu
    // kotak masuk tidak bisa dibanjiri tautan reset.
    this.rateLimiter.consumeOrThrow(`auth:forgot:${request.ip}`, 5, 15 * 60_000);
    this.rateLimiter.consumeOrThrow(
      `auth:forgot:email:${dto.email.trim().toLowerCase()}`,
      3,
      15 * 60_000,
    );

    // Tautan hanya dibuka untuk pilot/non-produksi; produksi wajib lewat email.
    const exposeLink =
      process.env.AUTH_EXPOSE_RESET_LINK === 'true' && process.env.NODE_ENV !== 'production';

    const result = await this.requestPasswordResetUseCase.execute({
      email: dto.email,
      requestedIp: request.ip ?? null,
      exposeLink,
    });

    return successResponse({ resetLink: result.resetLink });
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password with a reset token',
    description: 'Token sekali pakai; setelah berhasil seluruh sesi user dicabut.',
  })
  @ApiResponse({ status: 200, description: 'Password diperbarui' })
  @ApiResponse({ status: 400, description: 'Token reset tidak valid / kedaluwarsa' })
  @ApiResponse({ status: 429, description: 'Terlalu banyak percobaan' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: FastifyRequest) {
    // Token panjang, tapi percobaan menebak tetap dibatasi: 10 / menit per IP.
    this.rateLimiter.consumeOrThrow(`auth:reset:${request.ip}`, 10, 60_000);
    await this.resetPasswordUseCase.execute({ token: dto.token, password: dto.password });
    return successResponse(null);
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ganti password user yang sedang login',
    description:
      'Wajib menyertakan password lama. Sesi lain dicabut; sesi yang mengirim ' +
      'keepRefreshToken tetap hidup (bila kosong, semua sesi dicabut).',
  })
  @ApiResponse({ status: 200, description: 'Password diperbarui' })
  @ApiResponse({ status: 400, description: 'Payload tidak valid atau password lama salah' })
  @ApiResponse({ status: 429, description: 'Terlalu banyak percobaan' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @GetUser() user: JwtAccessPayload,
    @Req() request: FastifyRequest,
  ) {
    // Password lama bisa ditebak: 5 percobaan / 5 menit per user.
    this.rateLimiter.consumeOrThrow(`auth:change-password:${user.sub}`, 5, 5 * 60_000);

    await this.changePasswordUseCase.execute({
      userId: user.sub,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      keepRefreshToken: dto.keepRefreshToken ?? null,
    });

    return successResponse(null);
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
