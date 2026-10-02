import { Pool, PoolClient } from 'pg';
import { PurchaseOrderRepositoryPostgres } from '../PurchaseOrderRepositoryPostgres';

/**
 * Focused unit tests for the two Opsi A (2026-10-02) procurement changes on the
 * Purchase Order repository:
 *   1. cancel() no longer soft-deletes — a CANCELLED PO stays visible (no
 *      deleted_at / deleted_by written), only the status flips + a log row.
 *   2. list({ receivable: true }) adds an APPROVED + has-outstanding filter used
 *      by the "pick a source PO for a new GR" picker, without changing the
 *      default list contract.
 *
 * The pg client is mocked and sequenced by call order, mirroring the style used
 * by the other repository tests.
 */

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 'po1',
    company_id: 'c1',
    po_number: 'PO-OUT001-2026-000001',
    purchase_request_id: 'pr1',
    supplier_id: 'sup1',
    destination_outlet_id: 'outlet-1',
    order_date: new Date('2026-10-05'),
    payment_term_id: null,
    payment_term_code: null,
    payment_term_name: null,
    payment_term_due_days: null,
    estimated_payment_due_date: null,
    total_amount: '15000',
    tax_total: '0',
    grand_total: '15000',
    status: 'DRAFT',
    notes: null,
    approved_by: null,
    approved_at: null,
    created_by: 'u1',
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: 'poi1',
    product_id: 'prod-1',
    quantity: '3',
    uom_id: 'uom-1',
    unit_price: '5000',
    tax_percent: '0',
    subtotal: '15000',
    tax_amount: '0',
    total: '15000',
    ...over,
  };
}

function logRow(over: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    from_status: 'APPROVED',
    to_status: 'CANCELLED',
    actor_id: 'u1',
    actor_name: 'Budi Owner',
    note: null,
    created_at: new Date(),
    ...over,
  };
}

describe('PurchaseOrderRepositoryPostgres', () => {
  let repo: PurchaseOrderRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PurchaseOrderRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('cancel (Opsi A: terminal but NOT soft-deleted)', () => {
    it('APPROVED -> CANCELLED keeps the row visible (no deleted_at/by) and logs', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'APPROVED' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({ rows: [header({ status: 'CANCELLED' })], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rowCount: 1 }) // log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [logRow()], rowCount: 1 }) // logs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.cancel('po1', 'c1', 'u1', null);
      expect(result.status).toBe('CANCELLED');

      const updateCall = client.query.mock.calls[2];
      expect(updateCall[0]).not.toContain('deleted_at');
      expect(updateCall[0]).not.toContain('deleted_by');
      expect(updateCall[0]).toContain('status = $1');

      const logCall = client.query.mock.calls[3];
      expect(logCall[1]).toEqual(['po1', 'APPROVED', 'CANCELLED', 'u1', null]);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('list ({ receivable: true } picker filter)', () => {
    it('restricts to APPROVED + has-outstanding and still filters hard-deleted', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 }) // count
        .mockResolvedValueOnce({ rows: [header({ status: 'APPROVED' })], rowCount: 1 }) // headers
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items for row
        .mockResolvedValueOnce({ rows: [logRow({ to_status: 'APPROVED' })], rowCount: 1 }); // logs

      const result = await repo.list('c1', { limit: 10, offset: 0, receivable: true });
      expect(result.total).toBe(1);

      const countSql = String((mockPool.query as jest.Mock).mock.calls[0][0]);
      // Only APPROVED POs are candidates.
      expect(countSql).toContain("status = 'APPROVED'");
      // The outstanding check is a DB-side aggregation (no N+1): any PO line
      // whose qty exceeds consumed-by-GR qualifies.
      expect(countSql).toContain('EXISTS (');
      expect(countSql).toContain('goods_receipt_items');
      expect(countSql).toContain("gr.status IN ('DRAFT','COMPLETED')");
      // Default guard still present.
      expect(countSql).toContain('deleted_at IS NULL');
    });

    it('does NOT add the receivable predicate on a normal list (default contract unchanged)', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 }) // count
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // headers

      await repo.list('c1', { limit: 10, offset: 0 });
      const countSql = String((mockPool.query as jest.Mock).mock.calls[0][0]);
      expect(countSql).not.toContain('EXISTS (');
      expect(countSql).not.toContain("status = 'APPROVED'");
    });
  });
});
