import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PURCHASE_RETURN_REASONS } from '../../../../../Domains/purchase-returns/returnReason';

export class CreatePurchaseReturnItemDto {
  @ApiProperty({ description: 'Source Goods Receipt item UUID (must be returnable)' })
  @IsUUID()
  goodsReceiptItemId!: string;

  @ApiProperty({ example: 5, description: 'Quantity to return (> 0, <= returnable)' })
  @IsNumber()
  @Min(0.001)
  returnQuantity!: number;

  @ApiProperty({
    enum: PURCHASE_RETURN_REASONS,
    description: 'Controlled return reason',
  })
  @IsEnum(PURCHASE_RETURN_REASONS)
  reason!: (typeof PURCHASE_RETURN_REASONS)[number];

  @ApiPropertyOptional({
    description: 'Free-text reason. REQUIRED (non-empty) when reason = OTHER.',
  })
  // reasonDescription is MANDATORY when reason = OTHER (doc 26 §6 #17): validate
  // early at the DTO layer so an empty value fails with 400 before the use case.
  // CreatePurchaseReturn.verifyItem re-validates defensively at the domain layer.
  @ValidateIf((o: CreatePurchaseReturnItemDto) => o.reason === 'OTHER')
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o: CreatePurchaseReturnItemDto) => o.reason !== 'OTHER')
  @IsOptional()
  @IsString()
  reasonDescription?: string;
}

export class CreatePurchaseReturnDto {
  @ApiProperty({ description: 'Source Goods Receipt UUID (must be COMPLETED)' })
  @IsUUID()
  goodsReceiptId!: string;

  @ApiProperty({ example: '2026-10-10', description: 'Return date (valid date)' })
  @IsDateString()
  returnDate!: string;

  @ApiPropertyOptional({ description: 'Optional header notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreatePurchaseReturnItemDto],
    description: 'Return line items (at least one).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnItemDto)
  items!: CreatePurchaseReturnItemDto[];
}
