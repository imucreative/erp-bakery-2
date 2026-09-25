import { CreateUomUseCase } from '../CreateUomUseCase';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';
import { Uom } from '../../../../Domains/uoms/entities/Uom';

const mockRepo: jest.Mocked<UomRepository> = {
  addUom: jest.fn(),
  generateUomCode: jest.fn(),
  getUomsByCompany: jest.fn(),
  getUomById: jest.fn(),
  updateUom: jest.fn(),
  softDeleteUom: jest.fn(),
  countActiveDependents: jest.fn(),
} as unknown as jest.Mocked<UomRepository>;

const companyId = 'company-uuid';

const created = new Uom({
  id: 'uom-uuid',
  companyId,
  code: 'UOM-001',
  name: 'PCS',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CreateUomUseCase', () => {
  let useCase: CreateUomUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateUomUseCase(mockRepo);
    mockRepo.generateUomCode.mockResolvedValue('UOM-001');
    mockRepo.addUom.mockResolvedValue(created);
  });

  it('should generate a code and persist the UOM', async () => {
    const result = await useCase.execute({ name: 'PCS' }, companyId);
    expect(mockRepo.generateUomCode).toHaveBeenCalledWith(companyId);
    expect(mockRepo.addUom).toHaveBeenCalledWith({ code: 'UOM-001', name: 'PCS' }, companyId);
    expect(result.code).toBe('UOM-001');
  });

  it('should throw when payload is invalid', async () => {
    await expect(useCase.execute({ name: '' }, companyId)).rejects.toThrow(
      'CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
    expect(mockRepo.addUom).not.toHaveBeenCalled();
  });
});
