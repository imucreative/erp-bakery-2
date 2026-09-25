import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOutletDto {
  @ApiProperty({ example: 'Outlet Sudirman', description: 'Outlet name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Jl. Sudirman No. 1, Jakarta', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '021-555-0100', required: false, maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;
}
