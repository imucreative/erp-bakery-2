import { UpdatePaymentTerm } from '../entities/UpdatePaymentTerm';

describe('UpdatePaymentTerm', () => {
  it('should collect only provided fields with trimmed name', () => {
    const entity = new UpdatePaymentTerm({ name: '  Net 45  ', dueDays: 45 });
    expect(entity.fields).toEqual({ name: 'Net 45', dueDays: 45 });
  });

  it('should coerce isActive to boolean', () => {
    const entity = new UpdatePaymentTerm({ isActive: false });
    expect(entity.fields).toEqual({ isActive: false });
  });

  it('should accept dueDays of 0', () => {
    const entity = new UpdatePaymentTerm({ dueDays: 0 });
    expect(entity.fields.dueDays).toBe(0);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when no updatable field is present', () => {
    expect(() => new UpdatePaymentTerm({})).toThrow(
      'UPDATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new UpdatePaymentTerm(null)).toThrow(
      'UPDATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when name is not a string', () => {
    expect(() => new UpdatePaymentTerm({ name: 123 })).toThrow(
      'UPDATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when dueDays is not a number', () => {
    expect(() => new UpdatePaymentTerm({ dueDays: '30' })).toThrow(
      'UPDATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(() => new UpdatePaymentTerm({ name: 'a'.repeat(101) })).toThrow(
      'UPDATE_PAYMENT_TERM.NAME_LIMIT_CHAR',
    );
  });

  it('should throw DUE_DAYS_INVALID when dueDays is negative', () => {
    expect(() => new UpdatePaymentTerm({ dueDays: -5 })).toThrow(
      'UPDATE_PAYMENT_TERM.DUE_DAYS_INVALID',
    );
  });

  it('should throw DUE_DAYS_INVALID when dueDays is not an integer', () => {
    expect(() => new UpdatePaymentTerm({ dueDays: 1.5 })).toThrow(
      'UPDATE_PAYMENT_TERM.DUE_DAYS_INVALID',
    );
  });
});
