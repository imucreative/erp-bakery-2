import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PAYMENT_METHODS } from '../../../../../Domains/sales/paymentMethod';

export class SalesPaymentDto {
  @ApiProperty({ enum: PAYMENT_METHODS, description: 'Payment method' })
  @IsIn(PAYMENT_METHODS as unknown as string[])
  method!: string;

  @ApiProperty({ example: 50000, description: 'Payment amount (> 0)' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Optional reference number (card/QRIS/transfer)' })
  @IsOptional()
  @IsString()
  referenceNo?: string;
}

export class PaySalesOrderDto {
  @ApiProperty({ type: [SalesPaymentDto], description: 'Payments (Σ amount must equal grand total)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesPaymentDto)
  payments!: SalesPaymentDto[];
}
