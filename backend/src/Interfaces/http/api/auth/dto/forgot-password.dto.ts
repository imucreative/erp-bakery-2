import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'owner@erp.local', description: 'Email akun yang akan direset' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;
}
