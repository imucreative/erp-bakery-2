import { CreateStockAdjustment } from './CreateStockAdjustment';

/**
 * Domain Entity: UpdateStockAdjustment
 *
 * An adjustment DRAFT is fully editable (rule #19: DRAFT is editable).
 * Update replaces header notes/date and the full item set. Reuses the same
 * validation rules as CreateStockAdjustment.
 */
export class UpdateStockAdjustment extends CreateStockAdjustment {
  constructor(payload: unknown) {
    // Same shape & validation as create; the use case enforces status==DRAFT.
    super(payload);
  }
}
