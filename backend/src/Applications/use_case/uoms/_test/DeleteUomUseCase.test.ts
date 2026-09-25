import { DeleteUomUseCase } from '../DeleteUomUseCase';
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

const existing = new Uom({
  id: 'uom-uuid',
  companyId,
  code: 'UOM-001',
  name: 'PCS',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('DeleteUomUseCase', () => {
  let useCase: DeleteUomUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteUomUseCase(mockRepo);
    mockRepo.getUomById.mockResolvedValue(existing);
    mockRepo.countActiveDependents.mockResolvedValue(0);
  });

  it('should soft-delete when there are no dependents', async () => {
    await useCase.execute('uom-uuid', companyId);
    expect(mockRepo.softDeleteUom).toHaveBeenCalledWith('uom-uuid', companyId);
  });

  it('should block deletion when dependents exist', async () => {
    mockRepo.countActiveDependents.mockResolvedValue(1);
    await expect(useCase.execute('uom-uuid', companyId)).rejects.toThrow('UOM.IN_USE');
    expect(mockRepo.softDeleteUom).not.toHaveBeenCalled();
  });

  it('should propagate NOT_FOUND when the UOM does not exist', async () => {
    mockRepo.getUomById.mockRejectedValue(new Error('UOM.NOT_FOUND'));
    await expect(useCase.execute('missing', companyId)).rejects.toThrow('UOM.NOT_FOUND');
    expect(mockRepo.softDeleteUom).not.toHaveBeenCalled();
  });
});
