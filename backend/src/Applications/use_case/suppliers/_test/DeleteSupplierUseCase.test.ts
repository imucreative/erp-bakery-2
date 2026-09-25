import { DeleteSupplierUseCase } from '../DeleteSupplierUseCase';
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

const existing = new Supplier({
  id: 'sup-uuid',
  companyId,
  code: 'SUP-001',
  name: 'PT Tepung',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('DeleteSupplierUseCase', () => {
  let useCase: DeleteSupplierUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteSupplierUseCase(mockRepo);
    mockRepo.getSupplierById.mockResolvedValue(existing);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should soft-delete when there are no dependents', async () => {
    await useCase.execute('sup-uuid', companyId);
    expect(mockRepo.softDeleteSupplier).toHaveBeenCalledWith('sup-uuid', companyId);
  });

  it('should block deletion when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(1);
    await expect(useCase.execute('sup-uuid', companyId)).rejects.toThrow('SUPPLIER.IN_USE');
    expect(mockRepo.softDeleteSupplier).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND when the supplier does not exist', async () => {
    mockRepo.getSupplierById.mockRejectedValue(new Error('SUPPLIER.NOT_FOUND'));
    await expect(useCase.execute('missing', companyId)).rejects.toThrow('SUPPLIER.NOT_FOUND');
    expect(mockRepo.softDeleteSupplier).not.toHaveBeenCalled();
  });
});
