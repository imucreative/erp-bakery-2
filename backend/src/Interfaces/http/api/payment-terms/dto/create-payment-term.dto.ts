import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min, MaxLength } from 'class-validator';

export class CreatePaymentTermDto {
  @ApiProperty({
    example: 'NET30',
    description: 'Unique payment term code (normalised to uppercase, max 20 chars)',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: 'Net 30 Days', description: 'Payment term name (max 100 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 30, description: 'Number of days until due (non-negative integer)' })
  @IsInt()
  @Min(0)
  dueDays!: number;
}
