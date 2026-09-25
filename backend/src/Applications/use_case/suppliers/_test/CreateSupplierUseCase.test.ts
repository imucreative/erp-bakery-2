import { CreateSupplierUseCase } from '../CreateSupplierUseCase';
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

const created = new Supplier({
  id: 'sup-uuid',
  companyId,
  code: 'SUP-001',
  name: 'PT Tepung',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CreateSupplierUseCase', () => {
  let useCase: CreateSupplierUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateSupplierUseCase(mockRepo);
    mockRepo.generateSupplierCode.mockResolvedValue('SUP-001');
    mockRepo.addSupplier.mockResolvedValue(created);
  });

  it('should generate a code and persist the supplier', async () => {
    const result = await useCase.execute({ name: 'PT Tepung' }, companyId);
    expect(mockRepo.generateSupplierCode).toHaveBeenCalledWith(companyId);
    expect(mockRepo.addSupplier).toHaveBeenCalledWith(
      { code: 'SUP-001', name: 'PT Tepung', address: null, phone: null, picName: null },
      companyId,
    );
    expect(result.code).toBe('SUP-001');
  });

  it('should pass through trimmed optional fields', async () => {
    await useCase.execute({ name: 'PT', address: '  Jl. A  ', picName: '  Budi  ' }, companyId);
    expect(mockRepo.addSupplier).toHaveBeenCalledWith(
      { code: 'SUP-001', name: 'PT', address: 'Jl. A', phone: null, picName: 'Budi' },
      companyId,
    );
  });

  it('should throw when payload is invalid', async () => {
    await expect(useCase.execute({ name: '' }, companyId)).rejects.toThrow(
      'CREATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockRepo.addSupplier).not.toHaveBeenCalled();
  });
});
