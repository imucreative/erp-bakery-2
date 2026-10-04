import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class UpdateProductToppingDto {
  @ApiProperty({
    example: 1.5,
    required: false,
    description: 'Default consumed qty per sold item, in the topping product UOM. Must be > 0.',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  defaultQtyPerItem?: number;

  @ApiProperty({
    example: 2500,
    required: false,
    description: 'Extra price added to the item line when this topping is selected. Must be >= 0.',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  extraPrice?: number;

  @ApiProperty({ example: 1, required: false, description: 'Display sort order' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the topping' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
