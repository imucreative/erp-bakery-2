import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class OwnerDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Outlet ID filter' })
  @IsOptional()
  @IsString()
  outletId?: string;

  @ApiPropertyOptional({
    description: 'Sales trend and top-products period in days',
    enum: [7, 14, 30, 90],
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @IsIn([7, 14, 30, 90])
  periodDays?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of top product combinations',
    enum: [5, 10, 20, 50],
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @IsIn([5, 10, 20, 50])
  topProductsLimit?: number;
}
