import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token dari tautan reset password' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'Password baru (minimal 8 karakter)', minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
