import {
  OutletRepository,
  OutletListFilter,
  OutletListResult,
  NewOutletData,
} from '../OutletRepository';
import { Outlet } from '../entities/Outlet';
import { UpdateOutletFields } from '../entities/UpdateOutlet';

describe('OutletRepository (abstract contract)', () => {
  class TestOutletRepository extends OutletRepository {
    async addOutlet(_data: NewOutletData, _companyId: string): Promise<Outlet> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async generateOutletCode(_companyId: string): Promise<string> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getOutletsByCompany(
      _companyId: string,
      _filter: OutletListFilter,
    ): Promise<OutletListResult> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getOutletById(_id: string, _companyId: string): Promise<Outlet> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateOutlet(
      _id: string,
      _companyId: string,
      _fields: UpdateOutletFields,
    ): Promise<Outlet> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeleteOutlet(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async verifyOutletsBelongToCompany(
      _companyId: string,
      _outletIds: string[],
    ): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async findAccessibleByUser(
      _userId: string,
      _companyId: string,
      _allOutlets: boolean,
    ): Promise<Outlet[]> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestOutletRepository();

  it('addOutlet should throw when not implemented', async () => {
    await expect(
      repo.addOutlet({ code: 'OUT-001', name: 'A', address: null, phone: null }, 'c'),
    ).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('generateOutletCode should throw when not implemented', async () => {
    await expect(repo.generateOutletCode('c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getOutletsByCompany should throw when not implemented', async () => {
    await expect(
      repo.getOutletsByCompany('c', { limit: 10, offset: 0 }),
    ).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getOutletById should throw when not implemented', async () => {
    await expect(repo.getOutletById('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('updateOutlet should throw when not implemented', async () => {
    await expect(repo.updateOutlet('id', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('softDeleteOutlet should throw when not implemented', async () => {
    await expect(repo.softDeleteOutlet('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('verifyOutletsBelongToCompany should throw when not implemented', async () => {
    await expect(repo.verifyOutletsBelongToCompany('c', ['o'])).rejects.toThrow(
      'NOT_IMPLEMENTED',
    );
  });

  it('findAccessibleByUser should throw when not implemented', async () => {
    await expect(repo.findAccessibleByUser('u', 'c', false)).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
