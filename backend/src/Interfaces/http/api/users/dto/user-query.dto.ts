import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UserQueryDto {
  @ApiProperty({ required: false, example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false, description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by role UUID' })
  @IsOptional()
  @IsUUID('4')
  roleId?: string;

  // String enum: avoids implicit boolean coercion turning "false" into true.
  @ApiProperty({ required: false, enum: ['true', 'false'], description: 'Filter by active state' })
  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}
