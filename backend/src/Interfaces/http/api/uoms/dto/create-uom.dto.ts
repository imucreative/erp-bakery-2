import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUomDto {
  @ApiProperty({ example: 'PCS', description: 'Unit of measure name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'COUNT',
    description: 'Dimension code from /uom-dimensions (see menu Dimensi UOM)',
  })
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_]{0,19}$/, {
    message: 'dimension harus diawali huruf dan hanya berisi huruf, angka, atau underscore (maks. 20)',
  })
  dimension!: string;

  @ApiProperty({
    example: 1,
    description:
      '1 UOM = factor × canonical unit. Must be >= 1 because the canonical unit is the smallest unit.',
  })
  @IsNumber()
  @Min(1, { message: 'factorToCanonical minimal 1 (satuan kanonik adalah satuan terkecil)' })
  @Type(() => Number)
  factorToCanonical!: number;
}
