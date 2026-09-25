import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Siti Aminah', description: 'Full name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'siti@rotimakmur.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ example: 'Secret1234', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: '0812-3456-7890', required: false, maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    description: 'Role UUID — must belong to the current company',
  })
  @IsUUID('4')
  @IsNotEmpty()
  roleId!: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Outlet UUIDs this user can access — must belong to the current company',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Type(() => String)
  outletIds?: string[];
}
