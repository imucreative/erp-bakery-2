import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@rotimakmur.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Secret1234', description: 'Account password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

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
