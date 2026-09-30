import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * UpdateRoleDto
 *
 * `code` is intentionally NOT part of this DTO — role codes are immutable.
 * Any `code` sent in the body is stripped by the global ValidationPipe
 * (whitelist + forbidNonWhitelisted rejects unknown fields).
 *
 * When `permissions` is provided it is treated as a FULL replacement set.
 */
export class UpdateRoleDto {
  @ApiProperty({ example: 'Kepala Kasir', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Memimpin operasional kasir', required: false, nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['sales.manage', 'shift.manage', 'product.read'],
    description: 'Full permission set to sync; must all exist in the global catalog',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
