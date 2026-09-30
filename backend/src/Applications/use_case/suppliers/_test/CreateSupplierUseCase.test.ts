import { CreateSupplierUseCase } from '../CreateSupplierUseCase';
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

const created = new Supplier({
  id: 'sup-uuid',
  companyId,
  code: 'SUP-001',
  name: 'PT Tepung',
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

describe('CreateSupplierUseCase', () => {
  let useCase: CreateSupplierUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateSupplierUseCase(mockRepo, mockPaymentTermRepo);
    mockRepo.generateSupplierCode.mockResolvedValue('SUP-001');
    mockRepo.addSupplier.mockResolvedValue(created);
  });

  it('should generate a code and persist the supplier without a payment term', async () => {
    const result = await useCase.execute({ name: 'PT Tepung' }, companyId);
    expect(mockRepo.generateSupplierCode).toHaveBeenCalledWith(companyId);
    expect(mockPaymentTermRepo.getPaymentTermById).not.toHaveBeenCalled();
    expect(mockRepo.addSupplier).toHaveBeenCalledWith(
      {
        code: 'SUP-001',
        name: 'PT Tepung',
        address: null,
        phone: null,
        picName: null,
        defaultPaymentTermId: null,
      },
      companyId,
    );
    expect(result.code).toBe('SUP-001');
  });

  it('should pass through trimmed optional fields', async () => {
    await useCase.execute({ name: 'PT', address: '  Jl. A  ', picName: '  Budi  ' }, companyId);
    expect(mockRepo.addSupplier).toHaveBeenCalledWith(
      {
        code: 'SUP-001',
        name: 'PT',
        address: 'Jl. A',
        phone: null,
        picName: 'Budi',
        defaultPaymentTermId: null,
      },
      companyId,
    );
  });

  it('should persist the supplier when the payment term is valid and active', async () => {
    mockPaymentTermRepo.getPaymentTermById.mockResolvedValue(activePaymentTerm);
    await useCase.execute({ name: 'PT Tepung', defaultPaymentTermId: paymentTermId }, companyId);
    expect(mockPaymentTermRepo.getPaymentTermById).toHaveBeenCalledWith(paymentTermId, companyId);
    expect(mockRepo.addSupplier).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPaymentTermId: paymentTermId }),
      companyId,
    );
  });

  it('should treat an empty-string payment term as null and skip validation', async () => {
    await useCase.execute({ name: 'PT Tepung', defaultPaymentTermId: '' }, companyId);
    expect(mockPaymentTermRepo.getPaymentTermById).not.toHaveBeenCalled();
    expect(mockRepo.addSupplier).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPaymentTermId: null }),
      companyId,
    );
  });

  it('should throw when the payment term is not found / belongs to another company', async () => {
    mockPaymentTermRepo.getPaymentTermById.mockRejectedValue(new Error('PAYMENT_TERM.NOT_FOUND'));
    await expect(
      useCase.execute({ name: 'PT Tepung', defaultPaymentTermId: paymentTermId }, companyId),
    ).rejects.toThrow('SUPPLIER.PAYMENT_TERM_NOT_FOUND');
    expect(mockRepo.addSupplier).not.toHaveBeenCalled();
  });

  it('should throw when the payment term is inactive', async () => {
    mockPaymentTermRepo.getPaymentTermById.mockResolvedValue(inactivePaymentTerm);
    await expect(
      useCase.execute({ name: 'PT Tepung', defaultPaymentTermId: paymentTermId }, companyId),
    ).rejects.toThrow('SUPPLIER.PAYMENT_TERM_INACTIVE');
    expect(mockRepo.addSupplier).not.toHaveBeenCalled();
  });

  it('should throw when payload is invalid', async () => {
    await expect(useCase.execute({ name: '' }, companyId)).rejects.toThrow(
      'CREATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockRepo.addSupplier).not.toHaveBeenCalled();
  });
});
