import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCompanyStatusDto {
  @ApiProperty({ example: true, description: 'true = aktif, false = suspend' })
  @IsBoolean()
  isActive!: boolean;
}
