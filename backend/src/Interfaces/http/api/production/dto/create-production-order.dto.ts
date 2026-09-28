import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateProductionOrderDto {
  @ApiProperty({ description: 'Outlet UUID where production runs' })
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({
    description: 'Recipe UUID to run. Provide this OR productId (recipe wins).',
  })
  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @ApiPropertyOptional({
    description: 'Finished product UUID. Resolves the product ACTIVE recipe when recipeId omitted.',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: 40, description: 'Planned finished-goods quantity' })
  @IsNumber()
  @IsPositive()
  scheduledQty!: number;

  @ApiPropertyOptional({ example: '2026-09-28', description: 'Production date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  productionDate?: string;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
