import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';

export class PlatformCreateUserDto {
  @ApiProperty({ example: 'Siti Aminah', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'siti@rotimakmur.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ example: 'Tepung#2026', minLength: 8, maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*\d)(?=.*[^A-Za-z0-9\s])/, {
    message: 'Password minimal 8 karakter serta mengandung angka dan simbol',
  })
  password!: string;

  @ApiProperty({ required: false, maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ description: 'Target company UUID' })
  @IsUUID()
  @IsNotEmpty()
  companyId!: string;

  @ApiProperty({ description: 'Role UUID from the target company' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;
}
