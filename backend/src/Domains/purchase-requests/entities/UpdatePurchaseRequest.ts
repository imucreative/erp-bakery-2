import { CreatePurchaseRequest } from './CreatePurchaseRequest';

/**
 * Domain Entity: UpdatePurchaseRequest
 *
 * A PR is editable only in DRAFT or REJECTED (doc 43 §3); the use case +
 * repository enforce that status gate. The payload shape and validation are
 * identical to create, so we reuse CreatePurchaseRequest.
 */
export class UpdatePurchaseRequest extends CreatePurchaseRequest {
  constructor(payload: unknown) {
    super(payload);
  }
}
