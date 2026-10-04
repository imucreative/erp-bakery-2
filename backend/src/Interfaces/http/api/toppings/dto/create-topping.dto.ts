import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsUUID, Min } from 'class-validator';

export class CreateToppingDto {
  @ApiProperty({
    example: 'd3a7...uuid',
    description: 'Topping stock product UUID (must be RAW_MATERIAL or SEMI_FINISHED)',
  })
  @IsUUID('4')
  toppingProductId!: string;

  @ApiProperty({
    example: 25,
    description: 'Default consumed qty per sold item, in the topping product UOM. Must be > 0.',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  defaultQtyPerItem!: number;

  @ApiProperty({
    example: 2000,
    required: false,
    default: 0,
    description: 'Extra price added to the item line when this topping is selected. Must be >= 0.',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  extraPrice?: number;

  @ApiProperty({ example: 0, required: false, default: 0, description: 'Display sort order' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
