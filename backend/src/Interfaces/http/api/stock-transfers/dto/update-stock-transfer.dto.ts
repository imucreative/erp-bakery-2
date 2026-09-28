import { CreateStockTransferDto } from './create-stock-transfer.dto';

/** UpdateStockTransferDto — same shape as create; only DRAFT is editable. */
export class UpdateStockTransferDto extends CreateStockTransferDto {}
