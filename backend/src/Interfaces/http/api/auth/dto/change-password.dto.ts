import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Password yang sedang dipakai' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ description: 'Password baru (minimal 8 karakter)', minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;

  @ApiProperty({
    required: false,
    description:
      'Refresh token sesi saat ini — sesi ini dipertahankan, sesi lain dicabut. ' +
      'Bila kosong, semua sesi dicabut.',
  })
  @IsOptional()
  @IsString()
  keepRefreshToken?: string;
}
