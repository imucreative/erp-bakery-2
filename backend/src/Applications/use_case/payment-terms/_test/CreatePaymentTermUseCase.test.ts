import { CreatePaymentTermUseCase } from '../CreatePaymentTermUseCase';
import { PaymentTermRepository } from '../../../../Domains/payment-terms/PaymentTermRepository';
import { PaymentTerm } from '../../../../Domains/payment-terms/entities/PaymentTerm';

const mockRepo: jest.Mocked<PaymentTermRepository> = {
  addPaymentTerm: jest.fn(),
  isCodeTaken: jest.fn(),
  getPaymentTermsByCompany: jest.fn(),
  getActivePaymentTerms: jest.fn(),
  getPaymentTermById: jest.fn(),
  updatePaymentTerm: jest.fn(),
  softDeletePaymentTerm: jest.fn(),
  countActiveDependents: jest.fn(),
} as unknown as jest.Mocked<PaymentTermRepository>;

const companyId = 'company-uuid';

const created = new PaymentTerm({
  id: 'pt-uuid',
  companyId,
  code: 'NET30',
  name: 'Net 30 Days',
  dueDays: 30,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CreatePaymentTermUseCase', () => {
  let useCase: CreatePaymentTermUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePaymentTermUseCase(mockRepo);
    mockRepo.isCodeTaken.mockResolvedValue(false);
    mockRepo.addPaymentTerm.mockResolvedValue(created);
  });

  it('should check code uniqueness and persist the payment term', async () => {
    const result = await useCase.execute(
      { code: 'net30', name: 'Net 30 Days', dueDays: 30 },
      companyId,
    );
    expect(mockRepo.isCodeTaken).toHaveBeenCalledWith('NET30', companyId);
    expect(mockRepo.addPaymentTerm).toHaveBeenCalledWith(
      { code: 'NET30', name: 'Net 30 Days', dueDays: 30 },
      companyId,
    );
    expect(result.code).toBe('NET30');
  });

  it('should throw CODE_ALREADY_USED when the code is taken', async () => {
    mockRepo.isCodeTaken.mockResolvedValue(true);
    await expect(
      useCase.execute({ code: 'NET30', name: 'Net 30', dueDays: 30 }, companyId),
    ).rejects.toThrow('PAYMENT_TERM.CODE_ALREADY_USED');
    expect(mockRepo.addPaymentTerm).not.toHaveBeenCalled();
  });

  it('should throw when payload is invalid', async () => {
    await expect(useCase.execute({ code: '', name: '', dueDays: 30 }, companyId)).rejects.toThrow(
      'CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockRepo.isCodeTaken).not.toHaveBeenCalled();
    expect(mockRepo.addPaymentTerm).not.toHaveBeenCalled();
  });

  it('should throw when dueDays is negative', async () => {
    await expect(
      useCase.execute({ code: 'NET30', name: 'Net 30', dueDays: -1 }, companyId),
    ).rejects.toThrow('CREATE_PAYMENT_TERM.DUE_DAYS_INVALID');
    expect(mockRepo.addPaymentTerm).not.toHaveBeenCalled();
  });
});
