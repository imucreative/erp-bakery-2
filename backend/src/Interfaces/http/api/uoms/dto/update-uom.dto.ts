import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUomDto {
  @ApiProperty({ example: 'PCS', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: false, required: false, description: 'Activate / deactivate the UOM' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
