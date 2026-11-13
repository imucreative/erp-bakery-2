import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateUomDto {
  @ApiProperty({ example: 'PCS', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the UOM' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    required: false,
    example: 'COUNT',
    description: 'Dimension code from /uom-dimensions',
  })
  @Matches(/^[A-Za-z][A-Za-z0-9_]{0,19}$/, {
    message: 'dimension harus diawali huruf dan hanya berisi huruf, angka, atau underscore (maks. 20)',
  })
  @IsOptional()
  dimension?: string;

  @ApiProperty({
    required: false,
    example: 1000,
    description: '1 UOM = factor × canonical unit; must be >= 1 (canonical = smallest unit)',
  })
  @IsNumber()
  @Min(1, { message: 'factorToCanonical minimal 1 (satuan kanonik adalah satuan terkecil)' })
  @IsOptional()
  @Type(() => Number)
  factorToCanonical?: number;
}
