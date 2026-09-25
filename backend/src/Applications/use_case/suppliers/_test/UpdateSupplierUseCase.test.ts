import { UpdateSupplierUseCase } from '../UpdateSupplierUseCase';
import { SupplierRepository } from '../../../../Domains/suppliers/SupplierRepository';
import { Supplier } from '../../../../Domains/suppliers/entities/Supplier';

const mockRepo: jest.Mocked<SupplierRepository> = {
  addSupplier: jest.fn(),
  generateSupplierCode: jest.fn(),
  getSuppliersByCompany: jest.fn(),
  getSupplierById: jest.fn(),
  updateSupplier: jest.fn(),
  softDeleteSupplier: jest.fn(),
  countActiveDependents: jest.fn(),
} as unknown as jest.Mocked<SupplierRepository>;

const companyId = 'company-uuid';

const updated = new Supplier({
  id: 'sup-uuid',
  companyId,
  code: 'SUP-001',
  name: 'PT Baru',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UpdateSupplierUseCase', () => {
  let useCase: UpdateSupplierUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateSupplierUseCase(mockRepo);
    mockRepo.updateSupplier.mockResolvedValue(updated);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should apply the update when fields are valid', async () => {
    const result = await useCase.execute('sup-uuid', { name: 'PT Baru' }, companyId);
    expect(mockRepo.updateSupplier).toHaveBeenCalledWith('sup-uuid', companyId, {
      name: 'PT Baru',
    });
    expect(result.name).toBe('PT Baru');
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
