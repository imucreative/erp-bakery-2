import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'b1e5...uuid', description: 'Parent product group UUID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  productGroupId!: string;

  @ApiProperty({ example: 'Roti Manis', description: 'Category name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Kategori roti manis', required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
