import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { USER_ASSIGNABLE_COMMENT_CATEGORIES } from '../../../../../Domains/goods-receipts/goodsReceiptCommentCategory';

/**
 * Body for POST /goods-receipts/:id/comments.
 *
 * `body` is required and non-empty. `category` is optional and defaults to
 * INTERNAL; only user-assignable categories (INTERNAL/APPROVAL/EXTERNAL) are
 * accepted — SYSTEM is backend-only and rejected here. The domain entity
 * (AddGoodsReceiptComment) re-validates and trims defensively.
 */
export class AddGoodsReceiptCommentDto {
  @ApiProperty({ description: 'Comment text (non-empty)' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({
    description: 'Comment category (defaults to INTERNAL). SYSTEM is not allowed.',
    enum: USER_ASSIGNABLE_COMMENT_CATEGORIES,
    example: 'INTERNAL',
  })
  @IsOptional()
  @IsIn(USER_ASSIGNABLE_COMMENT_CATEGORIES)
  category?: string;
}
