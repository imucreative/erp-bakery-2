import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateOutletDto {
  @ApiProperty({ example: 'Outlet Sudirman', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Jl. Sudirman No. 1, Jakarta', required: false, nullable: true })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '021-555-0100', required: false, nullable: true, maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the outlet' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
