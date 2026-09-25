import { CreateOutletUseCase } from '../CreateOutletUseCase';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';
import { Outlet } from '../../../../Domains/outlets/entities/Outlet';

const mockOutletRepository: jest.Mocked<OutletRepository> = {
  addOutlet: jest.fn(),
  generateOutletCode: jest.fn(),
  getOutletsByCompany: jest.fn(),
  getOutletById: jest.fn(),
  updateOutlet: jest.fn(),
  softDeleteOutlet: jest.fn(),
  verifyOutletsBelongToCompany: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

const companyId = 'company-uuid';

const createdOutlet = new Outlet({
  id: 'outlet-uuid',
  companyId,
  code: 'OUT-001',
  name: 'Outlet A',
  address: null,
  phone: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CreateOutletUseCase', () => {
  let useCase: CreateOutletUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateOutletUseCase(mockOutletRepository);
    mockOutletRepository.generateOutletCode.mockResolvedValue('OUT-001');
    mockOutletRepository.addOutlet.mockResolvedValue(createdOutlet);
  });

  it('should generate a code and persist the outlet', async () => {
    const result = await useCase.execute({ name: 'Outlet A' }, companyId);

    expect(mockOutletRepository.generateOutletCode).toHaveBeenCalledWith(companyId);
    expect(mockOutletRepository.addOutlet).toHaveBeenCalledWith(
      { code: 'OUT-001', name: 'Outlet A', address: null, phone: null },
      companyId,
    );
    expect(result.code).toBe('OUT-001');
  });

  it('should pass through trimmed address and phone', async () => {
    await useCase.execute(
      { name: 'Outlet A', address: '  Jl. A  ', phone: '  021  ' },
      companyId,
    );

    expect(mockOutletRepository.addOutlet).toHaveBeenCalledWith(
      { code: 'OUT-001', name: 'Outlet A', address: 'Jl. A', phone: '021' },
      companyId,
    );
  });

  it('should throw when payload is invalid (domain validation)', async () => {
    await expect(useCase.execute({ name: '' }, companyId)).rejects.toThrow(
      'CREATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockOutletRepository.addOutlet).not.toHaveBeenCalled();
  });
});
