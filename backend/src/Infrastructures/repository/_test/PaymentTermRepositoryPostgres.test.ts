import { PaymentTermRepositoryPostgres } from '../PaymentTermRepositoryPostgres';
import { Pool } from 'pg';
import { PaymentTerm } from '../../../Domains/payment-terms/entities/PaymentTerm';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const paymentTermRow = {
  id: 'pt-uuid',
  company_id: 'company-uuid',
  code: 'NET30',
  name: 'Net 30 Days',
  due_days: 30,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('PaymentTermRepositoryPostgres', () => {
  let repo: PaymentTermRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PaymentTermRepositoryPostgres(mockPool);
  });

  describe('addPaymentTerm', () => {
    it('should return a PaymentTerm on success', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [paymentTermRow], rowCount: 1 });
      const result = await repo.addPaymentTerm(
        { code: 'NET30', name: 'Net 30 Days', dueDays: 30 },
        'company-uuid',
      );
      expect(result).toBeInstanceOf(PaymentTerm);
      expect(result.code).toBe('NET30');
      expect(result.dueDays).toBe(30);
    });
  });

  describe('isCodeTaken', () => {
    it('should return true when a matching row exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
      expect(await repo.isCodeTaken('NET30', 'company-uuid')).toBe(true);
    });

    it('should return false when no matching row exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      expect(await repo.isCodeTaken('NET30', 'company-uuid')).toBe(false);
    });

    it('should include an exclusion clause when excludeId is provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await repo.isCodeTaken('NET30', 'company-uuid', 'pt-uuid');
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('id <>');
    });

    // Regression guard: the code-uniqueness check must ignore soft-deleted rows
    // so a code can be reused after its owner is soft-deleted. This mirrors the
    // partial unique index (WHERE deleted_at IS NULL) added in migration
    // 1700000000028; a plain constraint that counted deleted rows produced a
    // 500 duplicate-key error on reuse.
    it('should exclude soft-deleted rows from the uniqueness check', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const reusable = await repo.isCodeTaken('NET30', 'company-uuid');
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('deleted_at IS NULL');
      expect(reusable).toBe(false);
    });
  });

  describe('getPaymentTermsByCompany', () => {
    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [paymentTermRow], rowCount: 1 });

      const result = await repo.getPaymentTermsByCompany('company-uuid', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);
    });

    it('should apply search and isActive filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [paymentTermRow], rowCount: 1 });

      await repo.getPaymentTermsByCompany('company-uuid', {
        limit: 10,
        offset: 0,
        search: 'Net',
        isActive: true,
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('is_active');
    });
  });

  describe('getActivePaymentTerms', () => {
    it('should return only active payment terms', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [paymentTermRow], rowCount: 1 });
      const result = await repo.getActivePaymentTerms('company-uuid');
      expect(result).toHaveLength(1);
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('is_active = TRUE');
    });
  });

  describe('getPaymentTermById', () => {
    it('should return a PaymentTerm when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [paymentTermRow], rowCount: 1 });
      const result = await repo.getPaymentTermById('pt-uuid', 'company-uuid');
      expect(result.id).toBe('pt-uuid');
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getPaymentTermById('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('updatePaymentTerm', () => {
    it('should return the updated PaymentTerm when fields are provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [paymentTermRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...paymentTermRow, due_days: 45 }], rowCount: 1 });

      const result = await repo.updatePaymentTerm('pt-uuid', 'company-uuid', { dueDays: 45 });
      expect(result.dueDays).toBe(45);
    });

    it('should map dueDays to due_days column', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [paymentTermRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...paymentTermRow, due_days: 45 }], rowCount: 1 });

      await repo.updatePaymentTerm('pt-uuid', 'company-uuid', { dueDays: 45 });
      const updateSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(updateSql).toContain('due_days');
    });

    it('should return current state when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [paymentTermRow], rowCount: 1 });
      const result = await repo.updatePaymentTerm('pt-uuid', 'company-uuid', {});
      expect(result.id).toBe('pt-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDeletePaymentTerm', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(
        repo.softDeletePaymentTerm('pt-uuid', 'company-uuid'),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.softDeletePaymentTerm('x', 'company-uuid')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('countActiveDependents', () => {
    it('should return 0 (no dependent modules yet)', async () => {
      expect(await repo.countActiveDependents('pt-uuid', 'company-uuid')).toBe(0);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });
});
