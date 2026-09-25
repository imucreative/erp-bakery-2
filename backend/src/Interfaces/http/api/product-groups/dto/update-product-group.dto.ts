import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductGroupDto {
  @ApiProperty({ example: 'Bahan Baku', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Kelompok bahan baku produksi', required: false, nullable: true, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the product group' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
