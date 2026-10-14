import { Pool, PoolClient } from 'pg';
import { ShiftRepositoryPostgres } from '../ShiftRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    company_id: 'c1',
    outlet_id: 'out1',
    cashier_user_id: 'u1',
    opened_at: new Date('2026-10-04T08:00:00Z'),
    closed_at: null,
    opening_cash: '500000.00',
    expected_cash: null,
    actual_cash: null,
    discrepancy: null,
    status: 'OPEN',
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

describe('ShiftRepositoryPostgres', () => {
  let repo: ShiftRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ShiftRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('openShift', () => {
    it('should insert and return an OPEN shift (happy path)', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [header({ status: 'OPEN' })],
        rowCount: 1,
      });

      const result = await repo.openShift('c1', 'u1', {
        outletId: 'out1',
        openingCash: 500000,
        notes: null,
      });

      expect(result.status).toBe('OPEN');
      expect(result.openingCash).toBe(500000);
      expect(result.expectedCash).toBeNull();
    });

    it('should translate a 23505 unique violation to SHIFT.ALREADY_OPEN', async () => {
      // Two attempts, each hitting the partial-unique-index violation.
      (mockPool.query as jest.Mock)
        .mockRejectedValueOnce({ code: '23505' })
        .mockRejectedValueOnce({ code: '23505' });

      await expect(
        repo.openShift('c1', 'u1', { outletId: 'out1', openingCash: 500000, notes: null }),
      ).rejects.toBeInstanceOf(ConflictError);
      await expect(
        repo.openShift('c1', 'u1', { outletId: 'out1', openingCash: 500000, notes: null }),
      ).rejects.toThrow('SHIFT.ALREADY_OPEN');
    });
  });

  describe('closeShift', () => {
    it('should close an OPEN shift and compute expected_cash + discrepancy (CASH payments)', async () => {
      // expected_cash = opening_cash + Σ(CASH payment) - Σ(CASH refund). Here
      // opening 500000 + 100000 CASH - 0 refund = 600000; actual 580000 →
      // discrepancy -20000.
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'OPEN', opening_cash: '500000.00' })], rowCount: 1 }) // lock row
        .mockResolvedValueOnce({ rows: [{ cash_total: '100000.00' }], rowCount: 1 }) // CASH sum
        .mockResolvedValueOnce({ rows: [{ refund_total: '0' }], rowCount: 1 }) // CASH refund sum
        .mockResolvedValueOnce({
          rows: [
            header({
              status: 'CLOSED',
              closed_at: new Date(),
              expected_cash: '600000.00',
              actual_cash: '580000.00',
              discrepancy: '-20000.00',
            }),
          ],
          rowCount: 1,
        }) // update
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.closeShift('s1', 'c1', 'u1', { actualCash: 580000, notes: null });

      expect(result.status).toBe('CLOSED');
      expect(result.expectedCash).toBe(600000);
      expect(result.actualCash).toBe(580000);
      expect(result.discrepancy).toBe(-20000);
      // The CASH-sum query counts CASH payments on PAID or REFUNDED orders.
      const cashCall = client.query.mock.calls[2];
      expect(cashCall[0]).toContain("payment_method = 'CASH'");
      expect(cashCall[0]).toContain("status IN ('PAID','REFUNDED')");
      // The refund-sum query sums refund_amount from sales_returns.
      const refundCall = client.query.mock.calls[3];
      expect(refundCall[0]).toContain('sales_returns');
      expect(refundCall[0]).toContain('refund_amount');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('expected_cash equals opening_cash when there are no CASH payments', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'OPEN', opening_cash: '500000.00' })], rowCount: 1 }) // lock row
        .mockResolvedValueOnce({ rows: [{ cash_total: '0' }], rowCount: 1 }) // CASH sum (none)
        .mockResolvedValueOnce({ rows: [{ refund_total: '0' }], rowCount: 1 }) // CASH refund sum (none)
        .mockResolvedValueOnce({
          rows: [
            header({
              status: 'CLOSED',
              expected_cash: '500000.00',
              actual_cash: '500000.00',
              discrepancy: '0.00',
            }),
          ],
          rowCount: 1,
        }) // update
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.closeShift('s1', 'c1', 'u1', { actualCash: 500000, notes: null });
      expect(result.expectedCash).toBe(500000);
      expect(result.discrepancy).toBe(0);
    });

    it('subtracts CASH refunds from expected_cash (doc 51 §4.2 / OQ-8)', async () => {
      // opening 500000 + 150000 CASH payments - 50000 CASH refund = 600000.
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'OPEN', opening_cash: '500000.00' })], rowCount: 1 }) // lock row
        .mockResolvedValueOnce({ rows: [{ cash_total: '150000.00' }], rowCount: 1 }) // CASH sum
        .mockResolvedValueOnce({ rows: [{ refund_total: '50000.00' }], rowCount: 1 }) // CASH refund sum
        .mockResolvedValueOnce({
          rows: [
            header({
              status: 'CLOSED',
              expected_cash: '600000.00',
              actual_cash: '600000.00',
              discrepancy: '0.00',
            }),
          ],
          rowCount: 1,
        }) // update
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.closeShift('s1', 'c1', 'u1', { actualCash: 600000, notes: null });
      // The UPDATE must have received expected_cash = 600000 (500000+150000-50000).
      const updateCall = client.query.mock.calls[4];
      expect(Number(updateCall[1][0])).toBeCloseTo(600000);
      expect(result.expectedCash).toBe(600000);
      expect(result.discrepancy).toBe(0);
    });

    it('should reject closing a shift that is already CLOSED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'CLOSED' })], rowCount: 1 }) // lock row
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.closeShift('s1', 'c1', 'u1', { actualCash: 100, notes: null }),
      ).rejects.toThrow('SHIFT.ALREADY_CLOSED');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw NotFoundError when the shift is missing', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // lock row (none)
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.closeShift('x', 'c1', 'u1', { actualCash: 100, notes: null }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getById', () => {
    it('should return the shift when found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [header()], rowCount: 1 });
      const result = await repo.getById('s1', 'c1');
      expect(result.id).toBe('s1');
    });

    it('should throw NotFoundError when missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return rows and total with filters applied', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // count
        .mockResolvedValueOnce({
          rows: [
            header({ outlet_name: 'Outlet Utama', cashier_name: 'Kasir Satu' }),
            header({ id: 's2', status: 'CLOSED' }),
          ],
          rowCount: 2,
        }); // page

      const { rows, total } = await repo.list('c1', {
        limit: 10,
        offset: 0,
        status: 'OPEN',
        outletId: 'out1',
        cashierUserId: 'u1',
      });

      expect(total).toBe(2);
      expect(rows).toHaveLength(2);
      expect(rows[0].outletName).toBe('Outlet Utama');
      expect(rows[0].cashierName).toBe('Kasir Satu');
      // first positional param is always companyId
      const countCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(countCall[1][0]).toBe('c1');
      const listQuery = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(listQuery).toContain('AS outlet_name');
      expect(listQuery).toContain('AS cashier_name');
      expect(listQuery).toContain('u.company_id = shifts.company_id');
    });
  });

  it('closeShift InvariantError is thrown via InvariantError type', async () => {
    client.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [header({ status: 'CLOSED' })], rowCount: 1 })
      .mockResolvedValueOnce(undefined);
    await expect(
      repo.closeShift('s1', 'c1', 'u1', { actualCash: 1, notes: null }),
    ).rejects.toBeInstanceOf(InvariantError);
  });
});
