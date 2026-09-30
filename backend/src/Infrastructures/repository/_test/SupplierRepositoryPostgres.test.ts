import { SupplierRepositoryPostgres } from '../SupplierRepositoryPostgres';
import { Pool } from 'pg';
import { Supplier } from '../../../Domains/suppliers/entities/Supplier';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

const mockPool = { query: jest.fn() } as unknown as Pool;

const supplierRow = {
  id: 'sup-uuid',
  company_id: 'company-uuid',
  code: 'SUP-001',
  name: 'PT Tepung',
  address: null,
  phone: null,
  pic_name: null,
  default_payment_term_id: null,
  default_payment_term_code: null,
  default_payment_term_name: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('SupplierRepositoryPostgres', () => {
  let repo: SupplierRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new SupplierRepositoryPostgres(mockPool);
  });

  describe('addSupplier', () => {
    it('should return a Supplier on success (insert id then select joined row)', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'sup-uuid' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [supplierRow], rowCount: 1 });

      const result = await repo.addSupplier(
        {
          code: 'SUP-001',
          name: 'PT Tepung',
          address: null,
          phone: null,
          picName: null,
          defaultPaymentTermId: null,
        },
        'company-uuid',
      );
      expect(result).toBeInstanceOf(Supplier);
      expect(result.code).toBe('SUP-001');

      const insertSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(insertSql).toContain('default_payment_term_id');
    });

    it('should persist a supplied default payment term id', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'sup-uuid' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              ...supplierRow,
              default_payment_term_id: 'pt-uuid',
              default_payment_term_code: 'NET30',
              default_payment_term_name: 'Net 30',
            },
          ],
          rowCount: 1,
        });

      const result = await repo.addSupplier(
        {
          code: 'SUP-001',
          name: 'PT Tepung',
          address: null,
          phone: null,
          picName: null,
          defaultPaymentTermId: 'pt-uuid',
        },
        'company-uuid',
      );
      expect(result.defaultPaymentTermId).toBe('pt-uuid');
      expect(result.defaultPaymentTermCode).toBe('NET30');
      expect(result.defaultPaymentTermName).toBe('Net 30');

      const insertParams = (mockPool.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(insertParams).toContain('pt-uuid');
    });
  });

  describe('generateSupplierCode', () => {
    it('should generate SUP-001 when none exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      expect(await repo.generateSupplierCode('company-uuid')).toBe('SUP-001');
    });

    it('should pad to 3 digits', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '9' }] });
      expect(await repo.generateSupplierCode('company-uuid')).toBe('SUP-010');
    });
  });

  describe('getSuppliersByCompany', () => {
    it('should return rows and total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [supplierRow], rowCount: 1 });

      const result = await repo.getSuppliersByCompany('company-uuid', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);

      const rowsSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(rowsSql).toContain('LEFT JOIN payment_terms');
      expect(rowsSql).toContain('default_payment_term_code');
    });

    it('should apply search and isActive filters', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [supplierRow], rowCount: 1 });

      await repo.getSuppliersByCompany('company-uuid', {
        limit: 10,
        offset: 0,
        search: 'Tepung',
        isActive: true,
      });

      const countSql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('is_active');
    });
  });

  describe('getSupplierById', () => {
    it('should return a Supplier when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [supplierRow], rowCount: 1 });
      const result = await repo.getSupplierById('sup-uuid', 'company-uuid');
      expect(result.id).toBe('sup-uuid');
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.getSupplierById('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateSupplier', () => {
    it('should return the updated Supplier when fields are provided', async () => {
      (mockPool.query as jest.Mock)
        // getSupplierById (existing)
        .mockResolvedValueOnce({ rows: [supplierRow], rowCount: 1 })
        // UPDATE
        .mockResolvedValueOnce({ rowCount: 1 })
        // getSupplierById (re-select joined)
        .mockResolvedValueOnce({ rows: [{ ...supplierRow, name: 'PT Baru' }], rowCount: 1 });

      const result = await repo.updateSupplier('sup-uuid', 'company-uuid', { name: 'PT Baru' });
      expect(result.name).toBe('PT Baru');
    });

    it('should map picName to pic_name column', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [supplierRow], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...supplierRow, pic_name: 'Budi' }], rowCount: 1 });

      await repo.updateSupplier('sup-uuid', 'company-uuid', { picName: 'Budi' });
      const updateSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(updateSql).toContain('pic_name');
    });

    it('should set default_payment_term_id when provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [supplierRow], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...supplierRow, default_payment_term_id: 'pt-uuid' }],
          rowCount: 1,
        });

      const result = await repo.updateSupplier('sup-uuid', 'company-uuid', {
        defaultPaymentTermId: 'pt-uuid',
      });
      const updateSql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(updateSql).toContain('default_payment_term_id');
      expect(result.defaultPaymentTermId).toBe('pt-uuid');
    });

    it('should clear default_payment_term_id when null is provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ ...supplierRow, default_payment_term_id: 'pt-uuid' }], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [supplierRow], rowCount: 1 });

      const result = await repo.updateSupplier('sup-uuid', 'company-uuid', {
        defaultPaymentTermId: null,
      });
      const updateParams = (mockPool.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(updateParams).toContain(null);
      expect(result.defaultPaymentTermId).toBeNull();
    });

    it('should return current state when no fields are provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [supplierRow], rowCount: 1 });
      const result = await repo.updateSupplier('sup-uuid', 'company-uuid', {});
      expect(result.id).toBe('sup-uuid');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDeleteSupplier', () => {
    it('should resolve when a row is updated', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await expect(repo.softDeleteSupplier('sup-uuid', 'company-uuid')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when no row matches', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      await expect(repo.softDeleteSupplier('x', 'company-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('countActiveDependents', () => {
    it('should return the dependent product count', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '2' }] });
      expect(await repo.countActiveDependents('sup-uuid', 'company-uuid')).toBe(2);
    });

    it('should query the products table by supplier_id', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });
      await repo.countActiveDependents('sup-uuid', 'company-uuid');
      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('products');
      expect(sql).toContain('supplier_id');
    });
  });
});
