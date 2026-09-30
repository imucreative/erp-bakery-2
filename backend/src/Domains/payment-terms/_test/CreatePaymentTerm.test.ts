import { CreatePaymentTerm } from '../entities/CreatePaymentTerm';

describe('CreatePaymentTerm', () => {
  it('should create entity with normalised (trimmed, uppercased) code and trimmed name', () => {
    const entity = new CreatePaymentTerm({ code: '  net30  ', name: '  Net 30 Days  ', dueDays: 30 });
    expect(entity.code).toBe('NET30');
    expect(entity.name).toBe('Net 30 Days');
    expect(entity.dueDays).toBe(30);
  });

  it('should accept dueDays of 0', () => {
    const entity = new CreatePaymentTerm({ code: 'COD', name: 'Cash on Delivery', dueDays: 0 });
    expect(entity.dueDays).toBe(0);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when payload is null', () => {
    expect(() => new CreatePaymentTerm(null)).toThrow(
      'CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(() => new CreatePaymentTerm({ name: 'Net 30', dueDays: 30 })).toThrow(
      'CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new CreatePaymentTerm({ code: 'NET30', dueDays: 30 })).toThrow(
      'CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when dueDays is missing', () => {
    expect(() => new CreatePaymentTerm({ code: 'NET30', name: 'Net 30' })).toThrow(
      'CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when code is not a string', () => {
    expect(() => new CreatePaymentTerm({ code: 123, name: 'Net 30', dueDays: 30 })).toThrow(
      'CREATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw NOT_MEET_DATA_TYPE_SPECIFICATION when dueDays is not a number', () => {
    expect(() => new CreatePaymentTerm({ code: 'NET30', name: 'Net 30', dueDays: '30' })).toThrow(
      'CREATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION',
    );
  });

  it('should throw CODE_LIMIT_CHAR when code exceeds 20 characters', () => {
    expect(
      () => new CreatePaymentTerm({ code: 'A'.repeat(21), name: 'Net 30', dueDays: 30 }),
    ).toThrow('CREATE_PAYMENT_TERM.CODE_LIMIT_CHAR');
  });

  it('should throw NAME_LIMIT_CHAR when name exceeds 100 characters', () => {
    expect(
      () => new CreatePaymentTerm({ code: 'NET30', name: 'a'.repeat(101), dueDays: 30 }),
    ).toThrow('CREATE_PAYMENT_TERM.NAME_LIMIT_CHAR');
  });

  it('should throw DUE_DAYS_INVALID when dueDays is negative', () => {
    expect(() => new CreatePaymentTerm({ code: 'NET30', name: 'Net 30', dueDays: -1 })).toThrow(
      'CREATE_PAYMENT_TERM.DUE_DAYS_INVALID',
    );
  });

  it('should throw DUE_DAYS_INVALID when dueDays is not an integer', () => {
    expect(() => new CreatePaymentTerm({ code: 'NET30', name: 'Net 30', dueDays: 30.5 })).toThrow(
      'CREATE_PAYMENT_TERM.DUE_DAYS_INVALID',
    );
  });
});
