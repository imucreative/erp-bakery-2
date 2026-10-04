import { Pool, PoolClient } from 'pg';
import { PurchaseReturnRepositoryPostgres } from '../PurchaseReturnRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';
import { NewPurchaseReturnData } from '../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * Unit tests for PurchaseReturnRepositoryPostgres. The pg client/pool is mocked
 * and sequenced by call order, mirroring GoodsReceiptRepositoryPostgres.test /
 * StockTransferRepositoryPostgres style.
 *
 * Coverage:
 *   - createDraft: generates number, inserts header/items/log, returns entity.
 *   - getReturnable: derives returnable from posted PURCHASE movements minus
 *     completed + submitted; rejects a non-COMPLETED GR.
 *   - submit: reserves (status flip) and rejects returnQuantity > returnable.
 *   - complete: posts RETURN reversal (happy), rejects INSUFFICIENT_STOCK, and
 *     is idempotent for an already-COMPLETED return.
 */

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function headerRow(over: Record<string, unknown> = {}) {
  return {
    id: 'ret1',
    company_id: 'c1',
    return_number: 'RTN-2026-000001',
    goods_receipt_id: 'gr1',
    purchase_order_id: 'po1',
    supplier_id: 'sup1',
    supplier_code: 'SUP-01',
    supplier_name: 'Vendor A',
    outlet_id: 'o1',
    outlet_code: 'OUT-01',
    outlet_name: 'Outlet A',
    return_date: new Date('2026-10-10'),
    status: 'DRAFT',
    notes: null,
    created_by: 'u1',
    updated_by: null,
    submitted_by: null,
    completed_by: null,
    cancelled_by: null,
    submitted_at: null,
    completed_at: null,
    cancelled_at: null,
    created_at: new Date('2026-10-10'),
    updated_at: new Date('2026-10-10'),
    ...over,
  };
}

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: 'rti1',
    goods_receipt_item_id: 'gri1',
    source_batch_id: 'batch1',
    source_movement_id: 'mov1',
    product_id: 'prod1',
    product_sku: 'SKU-1',
    product_name: 'Flour',
    uom_id: 'uom1',
    uom_code: 'KG',
    uom_name: 'Kilogram',
    batch_number: 'B-001',
    lot_number: null,
    expired_date: new Date('2026-12-31'),
    posted_accepted_quantity: '10',
    previously_returned_quantity: '0',
    return_quantity: '4',
    reason: 'DAMAGED',
    reason_description: null,
    ...over,
  };
}

const newData: NewPurchaseReturnData = {
  goodsReceiptId: 'gr1',
  purchaseOrderId: 'po1',
  supplierId: 'sup1',
  supplierCode: 'SUP-01',
  supplierName: 'Vendor A',
  outletId: 'o1',
  outletCode: 'OUT-01',
  outletName: 'Outlet A',
  returnDate: '2026-10-10',
  notes: null,
  items: [
    {
      goodsReceiptItemId: 'gri1',
      sourceBatchId: 'batch1',
      sourceMovementId: 'mov1',
      productId: 'prod1',
      productSku: 'SKU-1',
      productName: 'Flour',
      uomId: 'uom1',
      uomCode: 'KG',
      uomName: 'Kilogram',
      batchNumber: 'B-001',
      lotNumber: null,
      expiredDate: '2026-12-31',
      postedAcceptedQuantity: 10,
      previouslyReturnedQuantity: 0,
      returnQuantity: 4,
      reason: 'DAMAGED',
      reasonDescription: null,
    },
  ],
};

describe('PurchaseReturnRepositoryPostgres', () => {
  let repo: PurchaseReturnRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
    repo = new PurchaseReturnRepositoryPostgres(mockPool);
  });

  describe('createDraft', () => {
    it('generates a number, inserts header + items + log, returns the entity', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_serial: null }], rowCount: 1 }) // _generateNumber
        .mockResolvedValueOnce({ rows: [headerRow()], rowCount: 1 }) // INSERT header
        .mockResolvedValueOnce(undefined) // INSERT item
        .mockResolvedValueOnce(undefined) // INSERT log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // _loadItems
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // _loadLogs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.createDraft('c1', 'u1', newData);

      expect(result.returnNumber).toBe('RTN-2026-000001');
      expect(result.status).toBe('DRAFT');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].returnQuantity).toBe(4);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rolls back on error', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ max_serial: null }], rowCount: 1 }) // number
        .mockRejectedValueOnce(new Error('boom')) // INSERT header fails
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.createDraft('c1', 'u1', newData)).rejects.toThrow('boom');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('getReturnable', () => {
    it('derives returnable = posted − completed − submitted per GR item', async () => {
      (mockPool.query as jest.Mock)
        // 1. GR status check
        .mockResolvedValueOnce({ rows: [{ status: 'COMPLETED' }], rowCount: 1 })
        // 2. posted PURCHASE movements
        .mockResolvedValueOnce({
          rows: [
            {
              movement_id: 'mov1',
              posted_qty: '10',
              batch_id: 'batch1',
              goods_receipt_item_id: 'gri1',
              product_id: 'prod1',
              product_sku: 'SKU-1',
              product_name: 'Flour',
              uom_id: 'uom1',
              uom_code: 'KG',
              uom_name: 'Kilogram',
              batch_number: 'B-001',
              lot_number: null,
              expired_date: new Date('2026-12-31'),
            },
          ],
          rowCount: 1,
        })
        // 3. completed sum
        .mockResolvedValueOnce({ rows: [{ goods_receipt_item_id: 'gri1', total: '3' }], rowCount: 1 })
        // 4. submitted sum
        .mockResolvedValueOnce({ rows: [{ goods_receipt_item_id: 'gri1', total: '2' }], rowCount: 1 });

      const lines = await repo.getReturnable('gr1', 'c1');

      expect(lines).toHaveLength(1);
      expect(lines[0].postedAcceptedQuantity).toBe(10);
      expect(lines[0].completedReturnQuantity).toBe(3);
      expect(lines[0].submittedReturnQuantity).toBe(2);
      expect(lines[0].returnableQuantity).toBe(5); // 10 - 3 - 2
      expect(lines[0].sourceMovementId).toBe('mov1');
      expect(lines[0].sourceBatchId).toBe('batch1');
      expect(lines[0].uomCode).toBe('KG');
      expect(lines[0].uomName).toBe('Kilogram');
    });

    it('throws NotFoundError when the GR is missing/foreign', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getReturnable('grX', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects a non-COMPLETED GR', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ status: 'DRAFT' }],
        rowCount: 1,
      });
      await expect(repo.getReturnable('gr1', 'c1')).rejects.toThrow(
        'PURCHASE_RETURN.GOODS_RECEIPT_NOT_COMPLETED',
      );
    });
  });

  describe('submit', () => {
    it('reserves (DRAFT -> SUBMITTED) when returnQuantity <= returnable', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [headerRow()], rowCount: 1 }) // header FOR UPDATE
        .mockResolvedValueOnce({ rows: [itemRow({ return_quantity: '4' })], rowCount: 1 }) // _loadItems
        // _deriveReturnableForReturn: posted movements
        .mockResolvedValueOnce({ rows: [{ goods_receipt_item_id: 'gri1', posted_qty: '10' }], rowCount: 1 })
        // completed sum
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        // submitted sum (excluding this return)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'SUBMITTED' })], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce(undefined) // INSERT log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // _loadItems
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // _loadLogs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.submit('ret1', 'c1', 'u1', null);
      expect(result.status).toBe('SUBMITTED');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rejects when returnQuantity exceeds returnable', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [headerRow()], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow({ return_quantity: '8' })], rowCount: 1 }) // items
        // posted 10, completed 3, submitted(excl) 0 -> returnable 7; 8 > 7
        .mockResolvedValueOnce({ rows: [{ goods_receipt_item_id: 'gri1', posted_qty: '10' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ goods_receipt_item_id: 'gri1', total: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.submit('ret1', 'c1', 'u1', null)).rejects.toThrow(
        'PURCHASE_RETURN.RETURN_QTY_EXCEEDS_RETURNABLE',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('rejects an invalid status transition (e.g. COMPLETED)', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'COMPLETED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.submit('ret1', 'c1', 'u1', null)).rejects.toThrow(
        'PURCHASE_RETURN.INVALID_STATUS_TRANSITION',
      );
    });
  });

  describe('complete', () => {
    it('posts the RETURN reversal (SUBMITTED -> COMPLETED), decrementing the batch', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'SUBMITTED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow({ return_quantity: '4' })], rowCount: 1 }) // _loadItems
        .mockResolvedValueOnce({ rows: [{ qty_available: '10' }], rowCount: 1 }) // batch FOR UPDATE
        .mockResolvedValueOnce(undefined) // UPDATE batch
        .mockResolvedValueOnce(undefined) // INSERT movement
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'COMPLETED' })], rowCount: 1 }) // UPDATE header
        .mockResolvedValueOnce(undefined) // INSERT log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // _loadItems
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // _loadLogs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.complete('ret1', 'c1', 'u1', null);

      expect(result.status).toBe('COMPLETED');
      const sqls = client.query.mock.calls.map((c) => String(c[0]));
      expect(sqls.some((s) => s.includes("'RETURN'"))).toBe(true);
      expect(sqls.some((s) => s.includes("'PURCHASE_RETURN'"))).toBe(true);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rejects INVENTORY.INSUFFICIENT_STOCK when the batch balance is below the return qty', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'SUBMITTED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow({ return_quantity: '8' })], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [{ qty_available: '5' }], rowCount: 1 }) // batch has only 5
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('ret1', 'c1', 'u1', null)).rejects.toThrow(
        'INVENTORY.INSUFFICIENT_STOCK',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('is idempotent: an already-COMPLETED return returns unchanged without posting', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'COMPLETED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // _loadItems
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // _loadLogs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.complete('ret1', 'c1', 'u1', null);
      expect(result.status).toBe('COMPLETED');
      const sqls = client.query.mock.calls.map((c) => String(c[0]));
      expect(sqls.some((s) => s.includes('inventory_movements'))).toBe(false);
    });

    it('maps a duplicate source key (23505) to INVENTORY.DUPLICATE_MOVEMENT_SOURCE', async () => {
      const dupErr = Object.assign(new Error('dup'), { code: '23505' });
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'SUBMITTED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow({ return_quantity: '4' })], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [{ qty_available: '10' }], rowCount: 1 }) // batch
        .mockResolvedValueOnce(undefined) // UPDATE batch
        .mockRejectedValueOnce(dupErr) // INSERT movement raises 23505
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('ret1', 'c1', 'u1', null)).rejects.toThrow(
        'INVENTORY.DUPLICATE_MOVEMENT_SOURCE',
      );
    });
  });

  describe('cancel', () => {
    it('cancels a SUBMITTED return (releases reservation), stays visible', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'SUBMITTED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'CANCELLED' })], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce(undefined) // INSERT log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // _loadItems
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // _loadLogs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.cancel('ret1', 'c1', 'u1', 'wrong vendor');
      expect(result.status).toBe('CANCELLED');
      // Opsi A: the cancel UPDATE flips status but does NOT set deleted_at.
      const updateSql = client.query.mock.calls
        .map((c) => String(c[0]))
        .find((s) => s.includes('UPDATE purchase_returns'));
      expect(updateSql).toBeDefined();
      expect(updateSql).toContain("status = 'CANCELLED'");
      expect(updateSql).not.toContain('deleted_at');
    });

    it('rejects cancelling a COMPLETED return', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [headerRow({ status: 'COMPLETED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.cancel('ret1', 'c1', 'u1', null)).rejects.toBeInstanceOf(InvariantError);
    });
  });
});
