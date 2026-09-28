import { CreateStockAdjustmentDto } from './create-stock-adjustment.dto';

/**
 * UpdateStockAdjustmentDto — same shape as create. Only DRAFT is editable
 * (enforced in the use case + repository).
 */
export class UpdateStockAdjustmentDto extends CreateStockAdjustmentDto {}
