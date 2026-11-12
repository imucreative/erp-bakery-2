import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Password yang sedang dipakai' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description: 'Password baru (8-20 karakter, mengandung angka dan simbol)',
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
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
