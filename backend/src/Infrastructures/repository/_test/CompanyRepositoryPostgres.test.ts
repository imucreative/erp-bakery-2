import { CompanyRepositoryPostgres } from '../CompanyRepositoryPostgres';
import { Pool } from 'pg';
import { RegisterCompany } from '../../../Domains/companies/entities/RegisterCompany';
import { RegisteredCompany } from '../../../Domains/companies/entities/RegisteredCompany';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';

// ─── Mock pool ───────────────────────────────────────────────────────────────

const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CompanyRepositoryPostgres', () => {
  let repo: CompanyRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CompanyRepositoryPostgres(mockPool);
  });

  describe('addCompany', () => {
    it('should return a RegisteredCompany on success', async () => {
      const mockRow = { id: 'uuid', code: 'COMP-001', name: 'Roti', slug: 'roti' };
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const registerCompany = new RegisterCompany({
        name: 'Roti',
        slug: 'roti',
        ownerName: 'Budi',
        ownerEmail: 'budi@roti.com',
        ownerPassword: 'Secret123',
      });

      const result = await repo.addCompany(
        Object.assign(registerCompany, { code: 'COMP-001' }),
      );

      expect(result).toBeInstanceOf(RegisteredCompany);
      expect(result.id).toBe('uuid');
      expect(result.code).toBe('COMP-001');
    });
  });

  describe('verifyAvailableSlug', () => {
    it('should resolve when slug is available', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.verifyAvailableSlug('new-slug')).resolves.toBeUndefined();
    });

    it('should throw ConflictError when slug is taken', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'uuid' }], rowCount: 1 });

      await expect(repo.verifyAvailableSlug('taken-slug')).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('getCompanyById', () => {
    it('should return company data when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'uuid', code: 'COMP-001', name: 'Roti', slug: 'roti',
          address: null, phone: null, is_active: true,
        }],
        rowCount: 1,
      });

      const result = await repo.getCompanyById('uuid');
      expect(result.id).toBe('uuid');
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundError when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(repo.getCompanyById('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('generateCompanyCode', () => {
    it('should generate COMP-001 when no companies exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '0' }] });

      const code = await repo.generateCompanyCode();
      expect(code).toBe('COMP-001');
    });

    it('should pad to 3 digits', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '9' }] });

      const code = await repo.generateCompanyCode();
      expect(code).toBe('COMP-010');
    });
  });
});
