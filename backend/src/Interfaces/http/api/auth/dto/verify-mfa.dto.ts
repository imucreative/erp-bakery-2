import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({ description: 'Short-lived token returned by POST /auth/login' })
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @ApiProperty({ description: '6-digit TOTP code or a recovery code' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
