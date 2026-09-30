import {
  PURCHASE_REQUEST_STATUSES,
  isPurchaseRequestStatus,
  canTransition,
  isEditableStatus,
} from '../purchaseRequestStatus';

describe('isPurchaseRequestStatus', () => {
  it('should accept valid statuses', () => {
    for (const s of PURCHASE_REQUEST_STATUSES) {
      expect(isPurchaseRequestStatus(s)).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(isPurchaseRequestStatus('CLOSED')).toBe(false);
    expect(isPurchaseRequestStatus(3)).toBe(false);
    expect(isPurchaseRequestStatus(null)).toBe(false);
  });
});

describe('canTransition', () => {
  it('should allow DRAFT -> SUBMITTED and DRAFT -> CANCELLED', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('should allow SUBMITTED -> APPROVED and SUBMITTED -> REJECTED', () => {
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('SUBMITTED', 'REJECTED')).toBe(true);
  });

  it('should allow REJECTED -> DRAFT and REJECTED -> CANCELLED', () => {
    expect(canTransition('REJECTED', 'DRAFT')).toBe(true);
    expect(canTransition('REJECTED', 'CANCELLED')).toBe(true);
  });

  it('should forbid skipping states', () => {
    expect(canTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransition('DRAFT', 'REJECTED')).toBe(false);
    expect(canTransition('SUBMITTED', 'CANCELLED')).toBe(false);
    expect(canTransition('SUBMITTED', 'DRAFT')).toBe(false);
  });

  it('should treat APPROVED and CANCELLED as terminal', () => {
    expect(canTransition('APPROVED', 'DRAFT')).toBe(false);
    expect(canTransition('APPROVED', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'DRAFT')).toBe(false);
  });
});

describe('isEditableStatus', () => {
  it('should be editable only in DRAFT or REJECTED', () => {
    expect(isEditableStatus('DRAFT')).toBe(true);
    expect(isEditableStatus('REJECTED')).toBe(true);
    expect(isEditableStatus('SUBMITTED')).toBe(false);
    expect(isEditableStatus('APPROVED')).toBe(false);
    expect(isEditableStatus('CANCELLED')).toBe(false);
  });
});
