import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateRecipeItemDto {
  @ApiProperty({ description: 'Ingredient product UUID' })
  @IsUUID()
  ingredientProductId!: string;

  @ApiProperty({ example: 500, description: 'Base quantity per one recipe batch' })
  @IsNumber()
  @IsPositive()
  qty!: number;

  @ApiProperty({ description: 'UOM UUID for this ingredient' })
  @IsUUID()
  uomId!: string;

  @ApiPropertyOptional({ example: 5, description: 'Wastage allowance % (0..100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lossPercentage?: number;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Roti Tawar Klasik', description: 'Recipe name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Finished product UUID this recipe yields' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 20, description: 'Yield quantity of finished product per batch' })
  @IsNumber()
  @IsPositive()
  yieldQty!: number;

  @ApiProperty({ description: 'UOM UUID for the yield' })
  @IsUUID()
  yieldUomId!: string;

  @ApiPropertyOptional({ description: 'Preparation instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ type: [CreateRecipeItemDto], description: 'Ingredient lines' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeItemDto)
  items!: CreateRecipeItemDto[];
}
