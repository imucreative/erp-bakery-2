import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'CASHIER_LEAD',
    description: 'Role code — normalised to trimmed UPPERCASE; unique per company (max 50 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Kepala Kasir', description: 'Role display name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Memimpin operasional kasir', required: false, nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: [String],
    example: ['sales.manage', 'shift.manage', 'product.read'],
    description: 'Permission codes to assign; must all exist in the global catalog',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotContains([''])
  permissions!: string[];
}
