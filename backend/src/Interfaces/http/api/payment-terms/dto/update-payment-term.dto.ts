import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

/**
 * `code` is immutable after creation and is intentionally omitted here.
 */
export class UpdatePaymentTermDto {
  @ApiProperty({ example: 'Net 30 Days', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 30, required: false, description: 'Non-negative integer' })
  @IsInt()
  @IsOptional()
  @Min(0)
  dueDays?: number;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Activate / deactivate the payment term',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
