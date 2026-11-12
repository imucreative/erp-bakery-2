import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({ description: 'Short-lived token returned by POST /auth/login' })
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @ApiProperty({ description: '6-digit TOTP code or a recovery code' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'Keep the session after the browser closes — issues a longer-lived refresh token',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
