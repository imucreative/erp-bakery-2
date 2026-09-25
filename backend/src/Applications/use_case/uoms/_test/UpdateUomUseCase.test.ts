import { UpdateUomUseCase } from '../UpdateUomUseCase';
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

const updated = new Uom({
  id: 'uom-uuid',
  companyId,
  code: 'UOM-001',
  name: 'KG',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UpdateUomUseCase', () => {
  let useCase: UpdateUomUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateUomUseCase(mockRepo);
    mockRepo.updateUom.mockResolvedValue(updated);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should apply the update when fields are valid', async () => {
    const result = await useCase.execute('uom-uuid', { name: 'KG' }, companyId);
    expect(mockRepo.updateUom).toHaveBeenCalledWith('uom-uuid', companyId, { name: 'KG' });
    expect(result.name).toBe('KG');
  });

  it('should allow deactivation when there are no dependents', async () => {
    await useCase.execute('uom-uuid', { isActive: false }, companyId);
    expect(mockRepo.countActiveDependents).toHaveBeenCalledWith('uom-uuid', companyId);
    expect(mockRepo.updateUom).toHaveBeenCalled();
  });

  it('should block deactivation when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(2);
    await expect(useCase.execute('uom-uuid', { isActive: false }, companyId)).rejects.toThrow(
      'UOM.IN_USE',
    );
    expect(mockRepo.updateUom).not.toHaveBeenCalled();
  });

  it('should throw when payload has no updatable field', async () => {
    await expect(useCase.execute('uom-uuid', {}, companyId)).rejects.toThrow(
      'UPDATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
