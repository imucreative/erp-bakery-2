import { CreateStockTransfer } from './CreateStockTransfer';

/**
 * Domain Entity: UpdateStockTransfer
 * A DRAFT transfer is editable; reuses CreateStockTransfer validation.
 * The use case + repository enforce status == DRAFT.
 */
export class UpdateStockTransfer extends CreateStockTransfer {
  constructor(payload: unknown) {
    super(payload);
  }
}
