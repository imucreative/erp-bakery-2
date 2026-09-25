import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupplierDto {
  @ApiProperty({ example: 'PT Tepung Sejahtera', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Jl. Industri No. 5, Tangerang', required: false, nullable: true })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '021-555-0200', required: false, nullable: true, maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ example: 'Budi', required: false, nullable: true, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  picName?: string;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the supplier' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
