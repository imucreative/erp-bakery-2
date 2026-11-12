import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token dari tautan reset password' })
  @IsString()
  @IsNotEmpty()
  token!: string;

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
  password!: string;
}
