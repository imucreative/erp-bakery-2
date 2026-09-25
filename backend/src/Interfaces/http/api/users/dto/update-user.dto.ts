import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Siti Aminah', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: '0812-3456-7890', required: false, nullable: true, maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    required: false,
    description: 'Reassign role — must belong to the current company',
  })
  @IsUUID('4')
  @IsOptional()
  roleId?: string;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the user' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Full-sync of outlet assignments (replaces the current set)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Type(() => String)
  outletIds?: string[];
}
