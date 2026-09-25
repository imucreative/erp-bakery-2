import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'PT Tepung Sejahtera', description: 'Supplier name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Jl. Industri No. 5, Tangerang', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '021-555-0200', required: false, maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ example: 'Budi', required: false, maxLength: 100, description: 'Person in charge' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  picName?: string;
}
