import {
  GOODS_RECEIPT_STATUSES,
  isGoodsReceiptStatus,
  canTransition,
  isEditableStatus,
} from '../goodsReceiptStatus';

describe('goodsReceiptStatus value object', () => {
  it('exposes the canonical status set', () => {
    expect(GOODS_RECEIPT_STATUSES).toEqual(['DRAFT', 'COMPLETED', 'CANCELLED']);
  });

  it('isGoodsReceiptStatus guards unknown values', () => {
    expect(isGoodsReceiptStatus('DRAFT')).toBe(true);
    expect(isGoodsReceiptStatus('COMPLETED')).toBe(true);
    expect(isGoodsReceiptStatus('CANCELLED')).toBe(true);
    expect(isGoodsReceiptStatus('SUBMITTED')).toBe(false);
    expect(isGoodsReceiptStatus(123)).toBe(false);
    expect(isGoodsReceiptStatus(null)).toBe(false);
  });

  it('allows DRAFT -> COMPLETED and DRAFT -> CANCELLED', () => {
    expect(canTransition('DRAFT', 'COMPLETED')).toBe(true);
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('treats COMPLETED and CANCELLED as terminal', () => {
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransition('COMPLETED', 'DRAFT')).toBe(false);
    expect(canTransition('CANCELLED', 'DRAFT')).toBe(false);
    expect(canTransition('CANCELLED', 'COMPLETED')).toBe(false);
  });

  it('only DRAFT is editable', () => {
    expect(isEditableStatus('DRAFT')).toBe(true);
    expect(isEditableStatus('COMPLETED')).toBe(false);
    expect(isEditableStatus('CANCELLED')).toBe(false);
  });
});
