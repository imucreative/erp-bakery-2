import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { USER_ASSIGNABLE_COMMENT_CATEGORIES } from '../../../../../Domains/purchase-orders/purchaseOrderCommentCategory';

/**
 * Body for POST /purchase-orders/:id/comments.
 *
 * `body` is required and non-empty. `category` is optional and defaults to
 * INTERNAL; only user-assignable categories (INTERNAL/APPROVAL/EXTERNAL) are
 * accepted — SYSTEM is backend-only and rejected here. The domain entity
 * (AddPurchaseOrderComment) re-validates and trims defensively.
 */
export class AddPurchaseOrderCommentDto {
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
