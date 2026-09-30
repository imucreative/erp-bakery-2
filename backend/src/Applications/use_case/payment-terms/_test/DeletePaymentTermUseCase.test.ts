import { DeletePaymentTermUseCase } from '../DeletePaymentTermUseCase';
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

const existing = new PaymentTerm({
  id: 'pt-uuid',
  companyId,
  code: 'NET30',
  name: 'Net 30 Days',
  dueDays: 30,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('DeletePaymentTermUseCase', () => {
  let useCase: DeletePaymentTermUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeletePaymentTermUseCase(mockRepo);
    mockRepo.getPaymentTermById.mockResolvedValue(existing);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should soft-delete when there are no dependents', async () => {
    await useCase.execute('pt-uuid', companyId);
    expect(mockRepo.softDeletePaymentTerm).toHaveBeenCalledWith('pt-uuid', companyId);
  });

  it('should block deletion when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(1);
    await expect(useCase.execute('pt-uuid', companyId)).rejects.toThrow('PAYMENT_TERM.IN_USE');
    expect(mockRepo.softDeletePaymentTerm).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND when the payment term does not exist', async () => {
    mockRepo.getPaymentTermById.mockRejectedValue(new Error('PAYMENT_TERM.NOT_FOUND'));
    await expect(useCase.execute('missing', companyId)).rejects.toThrow('PAYMENT_TERM.NOT_FOUND');
    expect(mockRepo.softDeletePaymentTerm).not.toHaveBeenCalled();
  });
});
