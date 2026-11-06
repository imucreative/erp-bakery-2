import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterCompanyDto {
  @ApiProperty({
    example: 'Toko Roti Makmur',
    description: 'Company name (max 100 characters)',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'toko-roti-makmur',
    description: 'URL-friendly slug (lowercase letters, numbers, hyphens only)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug can only contain lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiProperty({ example: 'Budi Santoso', description: 'Owner full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownerName!: string;

  @ApiProperty({ example: 'budi@rotimakmur.com', description: 'Owner email address' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail!: string;

  @ApiProperty({
    example: 'Secret#1234',
    description:
      'Owner password (8-10 characters, must contain at least one number and symbol)',
    minLength: 8,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(10)
  @Matches(/^(?=.*\d)(?=.*[^A-Za-z0-9\s])/, {
    message: 'Owner password must contain at least one number and symbol',
  })
  ownerPassword!: string;

  @ApiProperty({
    example: '021-12345678',
    description: 'Company phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'Jl. Raya No. 1, Jakarta',
    description: 'Company address',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;
}
