import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

/** UpdatePurchaseOrderDto — same shape as create; only DRAFT/REJECTED editable. */
export class UpdatePurchaseOrderDto extends CreatePurchaseOrderDto {}
