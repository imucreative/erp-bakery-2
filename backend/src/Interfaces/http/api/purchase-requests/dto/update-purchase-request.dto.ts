import { CreatePurchaseRequestDto } from './create-purchase-request.dto';

/** UpdatePurchaseRequestDto — same shape as create; only DRAFT/REJECTED editable. */
export class UpdatePurchaseRequestDto extends CreatePurchaseRequestDto {}
