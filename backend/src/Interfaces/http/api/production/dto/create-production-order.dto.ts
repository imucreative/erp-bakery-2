import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

/**
 * CreateProductionOrderDto — the single INSTANT-COMPLETE production request.
 * Submitting this runs the whole production: backflush ingredients (FEFO) and
 * produce finished goods atomically, landing the order on COMPLETED.
 */
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

  @ApiProperty({ example: 40, description: 'Production target (planned finished-goods quantity)' })
  @IsNumber()
  @IsPositive()
  scheduledQty!: number;

  @ApiProperty({
    example: 38,
    description: 'Finished goods that succeeded and enter stock (>= 0)',
  })
  @IsNumber()
  @Min(0)
  actualQty!: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Quantity that failed/was scrapped and does NOT enter stock',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wasteQty?: number;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: 'Expiry for the finished-goods batch. Required when actualQty > 0.',
  })
  @IsOptional()
  @IsString()
  resultExpiredDate?: string;

  @ApiPropertyOptional({ example: '2026-10-03', description: 'Production date (YYYY-MM-DD), default today' })
  @IsOptional()
  @IsString()
  productionDate?: string;

  @ApiPropertyOptional({ description: 'Free-text notes (e.g. reason for waste)' })
  @IsOptional()
  @IsString()
  notes?: string;
}
