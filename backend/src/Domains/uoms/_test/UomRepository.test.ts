import { UomRepository, UomListFilter, UomListResult, NewUomData } from '../UomRepository';
import { Uom } from '../entities/Uom';
import { UpdateUomFields } from '../entities/UpdateUom';

describe('UomRepository (abstract contract)', () => {
  class TestUomRepository extends UomRepository {
    async addUom(_data: NewUomData, _companyId: string): Promise<Uom> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async generateUomCode(_companyId: string): Promise<string> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getUomsByCompany(_companyId: string, _filter: UomListFilter): Promise<UomListResult> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getUomById(_id: string, _companyId: string): Promise<Uom> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateUom(_id: string, _companyId: string, _fields: UpdateUomFields): Promise<Uom> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeleteUom(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async countActiveDependents(_id: string, _companyId: string): Promise<number> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestUomRepository();

  it('addUom should throw when not implemented', async () => {
    await expect(repo.addUom({ code: 'UOM-001', name: 'PCS' }, 'c')).rejects.toThrow(
      'NOT_IMPLEMENTED',
    );
  });

  it('generateUomCode should throw when not implemented', async () => {
    await expect(repo.generateUomCode('c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getUomsByCompany should throw when not implemented', async () => {
    await expect(repo.getUomsByCompany('c', { limit: 10, offset: 0 })).rejects.toThrow(
      'NOT_IMPLEMENTED',
    );
  });

  it('getUomById should throw when not implemented', async () => {
    await expect(repo.getUomById('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('updateUom should throw when not implemented', async () => {
    await expect(repo.updateUom('id', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('softDeleteUom should throw when not implemented', async () => {
    await expect(repo.softDeleteUom('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('countActiveDependents should throw when not implemented', async () => {
    await expect(repo.countActiveDependents('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
