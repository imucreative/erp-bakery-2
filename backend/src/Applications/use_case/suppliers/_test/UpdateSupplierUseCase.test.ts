import { UpdateSupplierUseCase } from '../UpdateSupplierUseCase';
import { SupplierRepository } from '../../../../Domains/suppliers/SupplierRepository';
import { PaymentTermRepository } from '../../../../Domains/payment-terms/PaymentTermRepository';
import { Supplier } from '../../../../Domains/suppliers/entities/Supplier';
import { PaymentTerm } from '../../../../Domains/payment-terms/entities/PaymentTerm';

const mockRepo: jest.Mocked<SupplierRepository> = {
  addSupplier: jest.fn(),
  generateSupplierCode: jest.fn(),
  getSuppliersByCompany: jest.fn(),
  getSupplierById: jest.fn(),
  updateSupplier: jest.fn(),
  softDeleteSupplier: jest.fn(),
  countActiveDependents: jest.fn(),
} as unknown as jest.Mocked<SupplierRepository>;

const mockPaymentTermRepo: jest.Mocked<PaymentTermRepository> = {
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
const paymentTermId = 'e2b6c1a0-0000-4000-8000-000000000001';

const updated = new Supplier({
  id: 'sup-uuid',
  companyId,
  code: 'SUP-001',
  name: 'PT Baru',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const activePaymentTerm = new PaymentTerm({
  id: paymentTermId,
  companyId,
  code: 'NET30',
  name: 'Net 30',
  dueDays: 30,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const inactivePaymentTerm = new PaymentTerm({
  id: paymentTermId,
  companyId,
  code: 'NET30',
  name: 'Net 30',
  dueDays: 30,
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UpdateSupplierUseCase', () => {
  let useCase: UpdateSupplierUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateSupplierUseCase(mockRepo, mockPaymentTermRepo);
    mockRepo.updateSupplier.mockResolvedValue(updated);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should apply the update when fields are valid (no payment term)', async () => {
    const result = await useCase.execute('sup-uuid', { name: 'PT Baru' }, companyId);
    expect(mockPaymentTermRepo.getPaymentTermById).not.toHaveBeenCalled();
    expect(mockRepo.updateSupplier).toHaveBeenCalledWith('sup-uuid', companyId, {
      name: 'PT Baru',
    });
    expect(result.name).toBe('PT Baru');
  });

  it('should set a valid active payment term', async () => {
    mockPaymentTermRepo.getPaymentTermById.mockResolvedValue(activePaymentTerm);
    await useCase.execute('sup-uuid', { defaultPaymentTermId: paymentTermId }, companyId);
    expect(mockPaymentTermRepo.getPaymentTermById).toHaveBeenCalledWith(paymentTermId, companyId);
    expect(mockRepo.updateSupplier).toHaveBeenCalledWith('sup-uuid', companyId, {
      defaultPaymentTermId: paymentTermId,
    });
  });

  it('should clear the payment term when null is sent without validating', async () => {
    await useCase.execute('sup-uuid', { defaultPaymentTermId: null }, companyId);
    expect(mockPaymentTermRepo.getPaymentTermById).not.toHaveBeenCalled();
    expect(mockRepo.updateSupplier).toHaveBeenCalledWith('sup-uuid', companyId, {
      defaultPaymentTermId: null,
    });
  });

  it('should throw when the payment term is not found / belongs to another company', async () => {
    mockPaymentTermRepo.getPaymentTermById.mockRejectedValue(new Error('PAYMENT_TERM.NOT_FOUND'));
    await expect(
      useCase.execute('sup-uuid', { defaultPaymentTermId: paymentTermId }, companyId),
    ).rejects.toThrow('SUPPLIER.PAYMENT_TERM_NOT_FOUND');
    expect(mockRepo.updateSupplier).not.toHaveBeenCalled();
  });

  it('should throw when the payment term is inactive', async () => {
    mockPaymentTermRepo.getPaymentTermById.mockResolvedValue(inactivePaymentTerm);
    await expect(
      useCase.execute('sup-uuid', { defaultPaymentTermId: paymentTermId }, companyId),
    ).rejects.toThrow('SUPPLIER.PAYMENT_TERM_INACTIVE');
    expect(mockRepo.updateSupplier).not.toHaveBeenCalled();
  });

  it('should allow deactivation when there are no dependents', async () => {
    await useCase.execute('sup-uuid', { isActive: false }, companyId);
    expect(mockRepo.countActiveDependents).toHaveBeenCalledWith('sup-uuid', companyId);
    expect(mockRepo.updateSupplier).toHaveBeenCalled();
  });

  it('should block deactivation when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(3);
    await expect(useCase.execute('sup-uuid', { isActive: false }, companyId)).rejects.toThrow(
      'SUPPLIER.IN_USE',
    );
    expect(mockRepo.updateSupplier).not.toHaveBeenCalled();
  });

  it('should throw when payload has no updatable field', async () => {
    await expect(useCase.execute('sup-uuid', {}, companyId)).rejects.toThrow(
      'UPDATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
