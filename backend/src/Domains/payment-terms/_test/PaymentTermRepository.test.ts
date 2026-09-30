import {
  PaymentTermRepository,
  PaymentTermListFilter,
  PaymentTermListResult,
  NewPaymentTermData,
} from '../PaymentTermRepository';
import { PaymentTerm } from '../entities/PaymentTerm';
import { UpdatePaymentTermFields } from '../entities/UpdatePaymentTerm';

describe('PaymentTermRepository (abstract contract)', () => {
  class TestPaymentTermRepository extends PaymentTermRepository {
    async addPaymentTerm(_data: NewPaymentTermData, _companyId: string): Promise<PaymentTerm> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async isCodeTaken(_code: string, _companyId: string, _excludeId?: string): Promise<boolean> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getPaymentTermsByCompany(
      _companyId: string,
      _filter: PaymentTermListFilter,
    ): Promise<PaymentTermListResult> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getActivePaymentTerms(_companyId: string): Promise<PaymentTerm[]> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getPaymentTermById(_id: string, _companyId: string): Promise<PaymentTerm> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async updatePaymentTerm(
      _id: string,
      _companyId: string,
      _fields: UpdatePaymentTermFields,
    ): Promise<PaymentTerm> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async softDeletePaymentTerm(_id: string, _companyId: string): Promise<void> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async countActiveDependents(_id: string, _companyId: string): Promise<number> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestPaymentTermRepository();

  it('addPaymentTerm should throw when not implemented', async () => {
    await expect(
      repo.addPaymentTerm({ code: 'NET30', name: 'Net 30', dueDays: 30 }, 'c'),
    ).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('isCodeTaken should throw when not implemented', async () => {
    await expect(repo.isCodeTaken('NET30', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getPaymentTermsByCompany should throw when not implemented', async () => {
    await expect(repo.getPaymentTermsByCompany('c', { limit: 10, offset: 0 })).rejects.toThrow(
      'NOT_IMPLEMENTED',
    );
  });

  it('getActivePaymentTerms should throw when not implemented', async () => {
    await expect(repo.getActivePaymentTerms('c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getPaymentTermById should throw when not implemented', async () => {
    await expect(repo.getPaymentTermById('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('updatePaymentTerm should throw when not implemented', async () => {
    await expect(repo.updatePaymentTerm('id', 'c', {})).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('softDeletePaymentTerm should throw when not implemented', async () => {
    await expect(repo.softDeletePaymentTerm('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('countActiveDependents should throw when not implemented', async () => {
    await expect(repo.countActiveDependents('id', 'c')).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
