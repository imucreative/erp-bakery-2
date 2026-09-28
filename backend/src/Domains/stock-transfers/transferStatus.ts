/**
 * Stock Transfer lifecycle (inventory-domain rule #16):
 *   DRAFT -> SUBMITTED -> IN_TRANSIT -> COMPLETED
 *   DRAFT -> CANCELLED, SUBMITTED -> CANCELLED
 * IN_TRANSIT and COMPLETED are not cancellable via normal workflow.
 */
export const TRANSFER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export function isTransferStatus(value: unknown): value is TransferStatus {
  return typeof value === 'string' && (TRANSFER_STATUSES as readonly string[]).includes(value);
}

const ALLOWED_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: TransferStatus, to: TransferStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
