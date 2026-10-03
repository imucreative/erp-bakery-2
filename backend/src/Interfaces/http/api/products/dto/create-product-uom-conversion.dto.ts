import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreateProductUomConversionDto {
  @ApiProperty({
    example: 'd3a7...uuid',
    description: 'Alternate unit-of-measure UUID (must differ from the product base unit)',
  })
  @IsUUID('4')
  uomId!: string;

  @ApiProperty({
    example: 25000,
    description: 'Conversion factor: 1 <uomId> = factorToBase <product base unit>. Must be > 0.',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  @Type(() => Number)
  factorToBase!: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
