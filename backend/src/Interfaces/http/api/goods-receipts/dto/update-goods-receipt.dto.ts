import { CreateGoodsReceiptDto } from './create-goods-receipt.dto';

/**
 * Update payload mirrors create; a GR is editable only in DRAFT (enforced by the
 * use case / repository).
 */
export class UpdateGoodsReceiptDto extends CreateGoodsReceiptDto {}
