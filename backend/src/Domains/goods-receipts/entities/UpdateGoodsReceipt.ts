import { CreateGoodsReceipt } from './CreateGoodsReceipt';

/**
 * Domain Entity: UpdateGoodsReceipt
 *
 * A GR is editable only in DRAFT; the use case + repository enforce that status
 * gate. The payload shape and validation are identical to create, so we reuse
 * CreateGoodsReceipt.
 */
export class UpdateGoodsReceipt extends CreateGoodsReceipt {
  constructor(payload: unknown) {
    super(payload);
  }
}
