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
    example: 'Secret1234',
    description: 'Owner password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
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
