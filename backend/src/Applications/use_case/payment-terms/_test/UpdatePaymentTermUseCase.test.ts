import { UpdatePaymentTermUseCase } from '../UpdatePaymentTermUseCase';
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

const updated = new PaymentTerm({
  id: 'pt-uuid',
  companyId,
  code: 'NET30',
  name: 'Net 45 Days',
  dueDays: 45,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UpdatePaymentTermUseCase', () => {
  let useCase: UpdatePaymentTermUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdatePaymentTermUseCase(mockRepo);
    mockRepo.updatePaymentTerm.mockResolvedValue(updated);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should apply the update when fields are valid', async () => {
    const result = await useCase.execute('pt-uuid', { name: 'Net 45 Days', dueDays: 45 }, companyId);
    expect(mockRepo.updatePaymentTerm).toHaveBeenCalledWith('pt-uuid', companyId, {
      name: 'Net 45 Days',
      dueDays: 45,
    });
    expect(result.name).toBe('Net 45 Days');
  });

  it('should allow deactivation when there are no dependents', async () => {
    await useCase.execute('pt-uuid', { isActive: false }, companyId);
    expect(mockRepo.countActiveDependents).toHaveBeenCalledWith('pt-uuid', companyId);
    expect(mockRepo.updatePaymentTerm).toHaveBeenCalled();
  });

  it('should block deactivation when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(2);
    await expect(useCase.execute('pt-uuid', { isActive: false }, companyId)).rejects.toThrow(
      'PAYMENT_TERM.IN_USE',
    );
    expect(mockRepo.updatePaymentTerm).not.toHaveBeenCalled();
  });

  it('should throw when payload has no updatable field', async () => {
    await expect(useCase.execute('pt-uuid', {}, companyId)).rejects.toThrow(
      'UPDATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
