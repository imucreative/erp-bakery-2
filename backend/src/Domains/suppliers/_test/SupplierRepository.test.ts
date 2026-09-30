import {
  SupplierRepository,
  SupplierListFilter,
  SupplierListResult,
  NewSupplierData,
} from '../SupplierRepository';
import { Supplier } from '../entities/Supplier';
import { UpdateSupplierFields } from '../entities/UpdateSupplier';

describe('SupplierRepository (abstract contract)', () => {
  class TestSupplierRepository extends SupplierRepository {
    async addSupplier(_data: NewSupplierData, _companyId: string): Promise<Supplier> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async generateSupplierCode(_companyId: string): Promise<string> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getSuppliersByCompany(
      _companyId: string,
      _filter: SupplierListFilter,
    ): Promise<SupplierListResult> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getSupplierById(_id: string, _companyId: string): Promise<Supplier> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updateSupplier(
      _id: string,
      _companyId: string,
      _fields: UpdateSupplierFields,
    ): Promise<Supplier> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeleteSupplier(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async countActiveDependents(_id: string, _companyId: string): Promise<number> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestSupplierRepository();

  it('addSupplier should throw when not implemented', async () => {
    await expect(
      repo.addSupplier(
        {
          code: 'SUP-001',
          name: 'A',
          address: null,
          phone: null,
          picName: null,
          defaultPaymentTermId: null,
        },
        'c',
      ),
    ).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('generateSupplierCode should throw when not implemented', async () => {
    await expect(repo.generateSupplierCode('c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getSuppliersByCompany should throw when not implemented', async () => {
    await expect(repo.getSuppliersByCompany('c', { limit: 10, offset: 0 })).rejects.toThrow(
      'NOT_IMPLEMENTED',
    );
  });

  it('getSupplierById should throw when not implemented', async () => {
    await expect(repo.getSupplierById('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('updateSupplier should throw when not implemented', async () => {
    await expect(repo.updateSupplier('id', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('softDeleteSupplier should throw when not implemented', async () => {
    await expect(repo.softDeleteSupplier('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('countActiveDependents should throw when not implemented', async () => {
    await expect(repo.countActiveDependents('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
