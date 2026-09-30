import { PaymentTerm } from '../entities/PaymentTerm';

const valid = {
  id: 'pt-uuid',
  companyId: 'company-uuid',
  code: 'NET30',
  name: 'Net 30 Days',
  dueDays: 30,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PaymentTerm', () => {
  it('should create entity with provided values', () => {
    const entity = new PaymentTerm(valid);
    expect(entity.code).toBe('NET30');
    expect(entity.name).toBe('Net 30 Days');
    expect(entity.dueDays).toBe(30);
    expect(entity.isActive).toBe(true);
  });

  it('should keep dueDays of 0', () => {
    const entity = new PaymentTerm({ ...valid, dueDays: 0 });
    expect(entity.dueDays).toBe(0);
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when code is missing', () => {
    expect(() => new PaymentTerm({ ...valid, code: '' })).toThrow(
      'PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should throw NOT_CONTAIN_NEEDED_PROPERTY when name is missing', () => {
    expect(() => new PaymentTerm({ ...valid, name: '' })).toThrow(
      'PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
