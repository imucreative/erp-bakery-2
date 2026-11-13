import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateUomDimensionDto {
  @ApiProperty({
    example: 'LENGTH',
    description: 'Immutable dimension code (uppercase letters, digits, underscore; max 20)',
  })
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_]{0,19}$/, {
    message: 'code harus diawali huruf dan hanya berisi huruf, angka, atau underscore (maks. 20)',
  })
  code!: string;

  @ApiProperty({ example: 'Panjang', description: 'Dimension display name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'milimeter',
    description: 'Canonical (smallest) unit name; created as a factor-1 UOM (max 100)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  canonicalUnitName!: string;

  @ApiProperty({
    example: 'mm',
    description: 'Canonical unit symbol used in hints/equivalents (max 20)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  canonicalUnitSymbol!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
