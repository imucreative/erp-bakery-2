import { CreatePurchaseReturnDto } from './create-purchase-return.dto';

/**
 * Update payload for a DRAFT Purchase Return. Identical shape to create — the
 * whole header + items are replaced (DRAFT only). Kept as a distinct class so
 * Swagger documents the update body separately and future divergence is cheap.
 */
export class UpdatePurchaseReturnDto extends CreatePurchaseReturnDto {}
