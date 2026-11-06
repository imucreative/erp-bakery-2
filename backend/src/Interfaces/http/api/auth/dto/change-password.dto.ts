import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Password yang sedang dipakai' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description: 'Password baru (minimal 8 karakter, mengandung angka dan simbol)',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*\d)(?=.*[^A-Za-z0-9\s])/, {
    message: 'Password baru minimal 8 karakter serta mengandung angka dan simbol',
  })
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
