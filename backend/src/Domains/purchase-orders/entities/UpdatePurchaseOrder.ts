import { CreatePurchaseOrder } from './CreatePurchaseOrder';

/**
 * Domain Entity: UpdatePurchaseOrder
 *
 * A PO is editable only in DRAFT or REJECTED (doc 26 §6); the use case +
 * repository enforce that status gate. The payload shape and validation are
 * identical to create, so we reuse CreatePurchaseOrder.
 */
export class UpdatePurchaseOrder extends CreatePurchaseOrder {
  constructor(payload: unknown) {
    super(payload);
  }
}
