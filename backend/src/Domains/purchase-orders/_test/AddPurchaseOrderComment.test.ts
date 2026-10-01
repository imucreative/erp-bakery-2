import { AddPurchaseOrderComment } from '../entities/AddPurchaseOrderComment';

describe('AddPurchaseOrderComment entity', () => {
  it('should default the category to INTERNAL and trim the body', () => {
    const comment = new AddPurchaseOrderComment({ body: '  needs review  ' });
    expect(comment.category).toBe('INTERNAL');
    expect(comment.body).toBe('needs review');
  });

  it('should accept the user-assignable categories', () => {
    expect(new AddPurchaseOrderComment({ body: 'x', category: 'INTERNAL' }).category).toBe(
      'INTERNAL',
    );
    expect(new AddPurchaseOrderComment({ body: 'x', category: 'APPROVAL' }).category).toBe(
      'APPROVAL',
    );
    expect(new AddPurchaseOrderComment({ body: 'x', category: 'EXTERNAL' }).category).toBe(
      'EXTERNAL',
    );
  });

  it('should reject a missing or non-string body', () => {
    expect(() => new AddPurchaseOrderComment({})).toThrow(
      'ADD_PURCHASE_ORDER_COMMENT.BODY_REQUIRED',
    );
    expect(() => new AddPurchaseOrderComment({ body: 123 })).toThrow(
      'ADD_PURCHASE_ORDER_COMMENT.BODY_REQUIRED',
    );
  });

  it('should reject an empty/whitespace body', () => {
    expect(() => new AddPurchaseOrderComment({ body: '   ' })).toThrow(
      'ADD_PURCHASE_ORDER_COMMENT.BODY_REQUIRED',
    );
  });

  it('should reject the SYSTEM category from user input', () => {
    expect(() => new AddPurchaseOrderComment({ body: 'x', category: 'SYSTEM' })).toThrow(
      'ADD_PURCHASE_ORDER_COMMENT.CATEGORY_NOT_ALLOWED',
    );
  });

  it('should reject an unknown category', () => {
    expect(() => new AddPurchaseOrderComment({ body: 'x', category: 'NOPE' })).toThrow(
      'ADD_PURCHASE_ORDER_COMMENT.INVALID_CATEGORY',
    );
  });

  it('should reject a non-object payload', () => {
    expect(() => new AddPurchaseOrderComment(null)).toThrow(
      'ADD_PURCHASE_ORDER_COMMENT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
