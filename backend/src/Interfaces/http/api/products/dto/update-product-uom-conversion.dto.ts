import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateProductUomConversionDto {
  @ApiProperty({
    example: 25000,
    required: false,
    description: 'Conversion factor: 1 <uom> = factorToBase <product base unit>. Must be > 0.',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  factorToBase?: number;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Activate / deactivate the conversion',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
