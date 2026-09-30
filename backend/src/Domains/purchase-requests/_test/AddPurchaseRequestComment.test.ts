import { AddPurchaseRequestComment } from '../entities/AddPurchaseRequestComment';

describe('AddPurchaseRequestComment entity', () => {
  it('should default the category to INTERNAL and trim the body', () => {
    const comment = new AddPurchaseRequestComment({ body: '  needs review  ' });
    expect(comment.category).toBe('INTERNAL');
    expect(comment.body).toBe('needs review');
  });

  it('should accept the user-assignable categories', () => {
    expect(new AddPurchaseRequestComment({ body: 'x', category: 'INTERNAL' }).category).toBe(
      'INTERNAL',
    );
    expect(new AddPurchaseRequestComment({ body: 'x', category: 'APPROVAL' }).category).toBe(
      'APPROVAL',
    );
    expect(new AddPurchaseRequestComment({ body: 'x', category: 'EXTERNAL' }).category).toBe(
      'EXTERNAL',
    );
  });

  it('should reject a missing or non-string body', () => {
    expect(() => new AddPurchaseRequestComment({})).toThrow(
      'ADD_PURCHASE_REQUEST_COMMENT.BODY_REQUIRED',
    );
    expect(() => new AddPurchaseRequestComment({ body: 123 })).toThrow(
      'ADD_PURCHASE_REQUEST_COMMENT.BODY_REQUIRED',
    );
  });

  it('should reject an empty/whitespace body', () => {
    expect(() => new AddPurchaseRequestComment({ body: '   ' })).toThrow(
      'ADD_PURCHASE_REQUEST_COMMENT.BODY_REQUIRED',
    );
  });

  it('should reject the SYSTEM category from user input', () => {
    expect(() => new AddPurchaseRequestComment({ body: 'x', category: 'SYSTEM' })).toThrow(
      'ADD_PURCHASE_REQUEST_COMMENT.CATEGORY_NOT_ALLOWED',
    );
  });

  it('should reject an unknown category', () => {
    expect(() => new AddPurchaseRequestComment({ body: 'x', category: 'NOPE' })).toThrow(
      'ADD_PURCHASE_REQUEST_COMMENT.INVALID_CATEGORY',
    );
  });

  it('should reject a non-object payload', () => {
    expect(() => new AddPurchaseRequestComment(null)).toThrow(
      'ADD_PURCHASE_REQUEST_COMMENT.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
