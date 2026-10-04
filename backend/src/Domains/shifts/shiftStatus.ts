/**
 * Shift lifecycle (POS / Sales — doc 51 §6.2):
 *   OPEN -> CLOSED
 * CLOSED is terminal; a closed shift cannot be reopened, and no transaction
 * may be posted against it.
 */
export const SHIFT_STATUSES = ['OPEN', 'CLOSED'] as const;

export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export function isShiftStatus(value: unknown): value is ShiftStatus {
  return typeof value === 'string' && (SHIFT_STATUSES as readonly string[]).includes(value);
}

const ALLOWED_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  OPEN: ['CLOSED'],
  CLOSED: [],
};

export function canTransition(from: ShiftStatus, to: ShiftStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
