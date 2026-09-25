import { UpdateOutletUseCase } from '../UpdateOutletUseCase';
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

const updatedOutlet = new Outlet({
  id: 'outlet-uuid',
  companyId,
  code: 'OUT-001',
  name: 'Renamed',
  address: null,
  phone: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UpdateOutletUseCase', () => {
  let useCase: UpdateOutletUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateOutletUseCase(mockOutletRepository);
    mockOutletRepository.updateOutlet.mockResolvedValue(updatedOutlet);
  });

  it('should validate the payload and delegate to the repository', async () => {
    const result = await useCase.execute('outlet-uuid', { name: 'Renamed' }, companyId);

    expect(mockOutletRepository.updateOutlet).toHaveBeenCalledWith(
      'outlet-uuid',
      companyId,
      { name: 'Renamed' },
    );
    expect(result.name).toBe('Renamed');
  });

  it('should throw when no updatable field is provided', async () => {
    await expect(useCase.execute('outlet-uuid', {}, companyId)).rejects.toThrow(
      'UPDATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockOutletRepository.updateOutlet).not.toHaveBeenCalled();
  });

  it('should throw on invalid field type', async () => {
    await expect(
      useCase.execute('outlet-uuid', { isActive: 'yes' }, companyId),
    ).rejects.toThrow('UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION');
  });
});
