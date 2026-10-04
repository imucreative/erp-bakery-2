import { Pool, PoolClient } from 'pg';
import { SalesOrderRepositoryPostgres } from '../SalesOrderRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 'so1',
    company_id: 'c1',
    outlet_id: 'out1',
    shift_id: 'sh1',
    invoice_number: 'INV-20261004-000001',
    customer_name: null,
    order_date: new Date('2026-10-04'),
    status: 'PENDING_PAYMENT',
    item_count: 1,
    subtotal: '15000.00',
    order_discount: '0.00',
    tax: '0.00',
    grand_total: '15000.00',
    cashier_user_id: 'u1',
    paid_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

describe('SalesOrderRepositoryPostgres', () => {
  let repo: SalesOrderRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new SalesOrderRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  // ── Mode resolution (§3.0) ──────────────────────────────────────────────
  describe('resolveCheckoutItems', () => {
    it('resolves MADE_TO_ORDER when an ACTIVE recipe exists', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'p1', name: 'Waffle', product_type: 'SEMI_FINISHED', selling_price: '8000.00' }],
          rowCount: 1,
        }) // product
        .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 }); // ACTIVE recipe

      const { items } = await repo.resolveCheckoutItems('c1', [
        { productId: 'p1', qty: 2, itemDiscount: 0, toppings: [] },
      ]);

      expect(items[0].saleMode).toBe('MADE_TO_ORDER');
      expect(items[0].recipeId).toBe('r1');
      expect(items[0].unitPriceSnapshot).toBe(8000);
      expect(items[0].lineTotal).toBe(16000);
    });

    it('resolves STOCK for FINISHED_GOODS without an ACTIVE recipe', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'p2', name: 'Air Mineral', product_type: 'FINISHED_GOODS', selling_price: '5000.00' }],
          rowCount: 1,
        }) // product
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no ACTIVE recipe

      const { items } = await repo.resolveCheckoutItems('c1', [
        { productId: 'p2', qty: 3, itemDiscount: 0, toppings: [] },
      ]);

      expect(items[0].saleMode).toBe('STOCK');
      expect(items[0].recipeId).toBeNull();
      expect(items[0].lineTotal).toBe(15000);
    });

    it('rejects RECIPE.NO_ACTIVE_RECIPE for non-FINISHED_GOODS without a recipe', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'p3', name: 'Tepung', product_type: 'RAW_MATERIAL', selling_price: '0.00' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repo.resolveCheckoutItems('c1', [{ productId: 'p3', qty: 1, itemDiscount: 0, toppings: [] }]),
      ).rejects.toThrow('RECIPE.NO_ACTIVE_RECIPE');
    });

    it('rejects TOPPING.NOT_ALLOWED when a STOCK product carries toppings', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'p2', name: 'Air Mineral', product_type: 'FINISHED_GOODS', selling_price: '5000.00' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no recipe → STOCK

      await expect(
        repo.resolveCheckoutItems('c1', [
          { productId: 'p2', qty: 1, itemDiscount: 0, toppings: [{ toppingProductId: 't1' }] },
        ]),
      ).rejects.toThrow('TOPPING.NOT_ALLOWED');
    });

    it('rejects TOPPING.NOT_ALLOWED when a topping is not registered/active for the product', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'p1', name: 'Waffle', product_type: 'SEMI_FINISHED', selling_price: '8000.00' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 }) // ACTIVE recipe → MADE_TO_ORDER
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // topping not in product_toppings

      await expect(
        repo.resolveCheckoutItems('c1', [
          { productId: 'p1', qty: 1, itemDiscount: 0, toppings: [{ toppingProductId: 'tX' }] },
        ]),
      ).rejects.toThrow('TOPPING.NOT_ALLOWED');
    });

    it('snapshots allowed topping price into the line total (MADE_TO_ORDER)', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'p1', name: 'Waffle', product_type: 'SEMI_FINISHED', selling_price: '8000.00' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              topping_product_id: 't1',
              topping_name: 'Selai',
              default_qty_per_item: '25.000',
              extra_price: '2000.00',
            },
          ],
          rowCount: 1,
        });

      const { items } = await repo.resolveCheckoutItems('c1', [
        { productId: 'p1', qty: 2, itemDiscount: 0, toppings: [{ toppingProductId: 't1' }] },
      ]);
      // (8000 + 2000) * 2 = 20000
      expect(items[0].toppingsPrice).toBe(2000);
      expect(items[0].lineTotal).toBe(20000);
      expect(items[0].toppings[0].qtyPerItem).toBe(25);
    });

    it('rejects PRODUCT.NOT_FOUND for a missing product', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(
        repo.resolveCheckoutItems('c1', [{ productId: 'x', qty: 1, itemDiscount: 0, toppings: [] }]),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── Checkout ────────────────────────────────────────────────────────────
  describe('createOrder', () => {
    it('inserts header + items + toppings and returns the order', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // invoice counter
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // insert header
        .mockResolvedValueOnce({ rows: [{ id: 'it1' }], rowCount: 1 }) // insert item
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert topping
        // _loadItems: items then toppings
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'it1',
              product_id: 'p1',
              sale_mode: 'MADE_TO_ORDER',
              recipe_id: 'r1',
              product_name_snapshot: 'Waffle',
              unit_price_snapshot: '8000.00',
              qty: '2.000',
              item_discount: '0.00',
              toppings_price: '2000.00',
              line_total: '20000.00',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // item toppings
        .mockResolvedValueOnce(undefined); // COMMIT

      const order = await repo.createOrder('c1', {
        outletId: 'out1',
        shiftId: 'sh1',
        customerName: null,
        itemCount: 2,
        subtotal: 20000,
        orderDiscount: 0,
        tax: 0,
        grandTotal: 20000,
        cashierUserId: 'u1',
        items: [
          {
            productId: 'p1',
            saleMode: 'MADE_TO_ORDER',
            recipeId: 'r1',
            productNameSnapshot: 'Waffle',
            unitPriceSnapshot: 8000,
            qty: 2,
            itemDiscount: 0,
            toppingsPrice: 2000,
            lineTotal: 20000,
            toppings: [
              { toppingProductId: 't1', toppingNameSnapshot: 'Selai', qtyPerItem: 25, extraPriceSnapshot: 2000 },
            ],
          },
        ],
      });

      expect(order.status).toBe('PENDING_PAYMENT');
      expect(order.items).toHaveLength(1);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  // ── Pay (STOCK) ───────────────────────────────────────────────────────
  describe('pay — STOCK mode', () => {
    it('deducts finished-goods stock FEFO and marks PAID', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ grand_total: '15000.00' })], rowCount: 1 }) // lock order
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'it1',
              product_id: 'p2',
              sale_mode: 'STOCK',
              recipe_id: null,
              product_name_snapshot: 'Air Mineral',
              unit_price_snapshot: '5000.00',
              qty: '3.000',
              item_discount: '0.00',
              toppings_price: '0.00',
              line_total: '15000.00',
            },
          ],
        }) // load items
        // _consumeFefo for p2: batch select, update, movement insert, consumption insert
        .mockResolvedValueOnce({ rows: [{ id: 'b1', qty_available: '10.000' }] }) // FEFO batches
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rows: [{ id: 'mv1' }], rowCount: 1 }) // movement insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // payment insert
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID', paid_at: new Date() })], rowCount: 1 }) // update header
        .mockResolvedValueOnce({ rows: [] }) // _loadItems items
        .mockResolvedValueOnce({ rows: [] }) // _loadItems toppings? (skipped — no items)
        .mockResolvedValueOnce({ rows: [] }) // _loadPayments
        .mockResolvedValueOnce(undefined); // COMMIT

      // NOTE: _loadItems returns [] (empty items) so it skips the toppings query.
      const order = await repo.pay('so1', 'c1', 'u1', [{ method: 'CASH', amount: 15000, referenceNo: null }]);
      expect(order.status).toBe('PAID');
      // SALE movement posted with the SALES_ORDER source key.
      const movementCall = client.query.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes("'SALE'"),
      );
      expect(movementCall).toBeDefined();
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rolls back with INVENTORY.INSUFFICIENT_STOCK when stock is short', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ grand_total: '15000.00' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'it1',
              product_id: 'p2',
              sale_mode: 'STOCK',
              recipe_id: null,
              product_name_snapshot: 'Air Mineral',
              unit_price_snapshot: '5000.00',
              qty: '3.000',
              item_discount: '0.00',
              toppings_price: '0.00',
              line_total: '15000.00',
            },
          ],
        }) // items
        .mockResolvedValueOnce({ rows: [{ id: 'b1', qty_available: '1.000' }] }) // only 1 in stock
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch (take 1)
        .mockResolvedValueOnce({ rows: [{ id: 'mv1' }], rowCount: 1 }) // movement
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.pay('so1', 'c1', 'u1', [{ method: 'CASH', amount: 15000, referenceNo: null }]),
      ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('rejects PAYMENT.AMOUNT_MISMATCH when Σ payments != grand_total', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ grand_total: '15000.00' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.pay('so1', 'c1', 'u1', [{ method: 'CASH', amount: 10000, referenceNo: null }]),
      ).rejects.toThrow('PAYMENT.AMOUNT_MISMATCH');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('rejects SALES_ORDER.ALREADY_PAID (idempotency guard)', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID' })], rowCount: 1 }) // lock → already PAID
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.pay('so1', 'c1', 'u1', [{ method: 'CASH', amount: 15000, referenceNo: null }]),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('translates a duplicate source-key 23505 to INVENTORY.DUPLICATE_MOVEMENT_SOURCE', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ grand_total: '15000.00' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'it1',
              product_id: 'p2',
              sale_mode: 'STOCK',
              recipe_id: null,
              product_name_snapshot: 'Air Mineral',
              unit_price_snapshot: '5000.00',
              qty: '3.000',
              item_discount: '0.00',
              toppings_price: '0.00',
              line_total: '15000.00',
            },
          ],
        }) // items
        .mockResolvedValueOnce({ rows: [{ id: 'b1', qty_available: '10.000' }] }) // FEFO
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch
        .mockRejectedValueOnce({ code: '23505' }) // movement insert collides
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.pay('so1', 'c1', 'u1', [{ method: 'CASH', amount: 15000, referenceNo: null }]),
      ).rejects.toThrow('INVENTORY.DUPLICATE_MOVEMENT_SOURCE');
    });

    it('throws SALES_ORDER.NOT_FOUND when the order is missing', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // lock → none
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.pay('x', 'c1', 'u1', [{ method: 'CASH', amount: 15000, referenceNo: null }]),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── Pay (MADE_TO_ORDER) ─────────────────────────────────────────────────
  describe('pay — MADE_TO_ORDER mode', () => {
    it('backflushes recipe ingredients + topping via FEFO and marks PAID', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ grand_total: '20000.00' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'it1',
              product_id: 'p1',
              sale_mode: 'MADE_TO_ORDER',
              recipe_id: 'r1',
              product_name_snapshot: 'Waffle',
              unit_price_snapshot: '8000.00',
              qty: '2.000',
              item_discount: '0.00',
              toppings_price: '2000.00',
              line_total: '20000.00',
            },
          ],
        }) // load items
        .mockResolvedValueOnce({ rows: [{ yield_qty: '10.000' }], rowCount: 1 }) // recipe yield
        .mockResolvedValueOnce({ rows: [{ id: 'ri1', ingredient_product_id: 'ing1', qty: '1000.000' }] }) // recipe items
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'tp1',
              sales_order_item_id: 'it1',
              topping_product_id: 't1',
              topping_name_snapshot: 'Selai',
              qty_per_item: '25.000',
              extra_price_snapshot: '2000.00',
            },
          ],
        }) // item toppings
        // target 1: ingredient ing1 → 1000 * (2/10) = 200
        .mockResolvedValueOnce({ rows: [{ id: 'b1', qty_available: '500.000' }] }) // FEFO ing1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rows: [{ id: 'mv1' }], rowCount: 1 }) // movement
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption
        // target 2: topping t1 → 25 * 2 = 50
        .mockResolvedValueOnce({ rows: [{ id: 'b2', qty_available: '100.000' }] }) // FEFO t1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rows: [{ id: 'mv2' }], rowCount: 1 }) // movement
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // payment insert
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID' })], rowCount: 1 }) // update header
        .mockResolvedValueOnce({ rows: [] }) // _loadItems items
        .mockResolvedValueOnce({ rows: [] }) // _loadPayments
        .mockResolvedValueOnce(undefined); // COMMIT

      const order = await repo.pay('so1', 'c1', 'u1', [{ method: 'CASH', amount: 20000, referenceNo: null }]);
      expect(order.status).toBe('PAID');

      // The ingredient movement took 200 (1000 * 2/10) and the topping took 50 (25 * 2).
      const batchUpdateCalls = client.query.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('UPDATE inventory_batches'),
      );
      // first update: ingredient 500 - 200 = 300
      expect(Number(batchUpdateCalls[0][1][0])).toBeCloseTo(300);
      // second update: topping 100 - 50 = 50
      expect(Number(batchUpdateCalls[1][1][0])).toBeCloseTo(50);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  // ── Void ────────────────────────────────────────────────────────────────
  describe('void', () => {
    it('cancels a PENDING_PAYMENT order', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // lock
        .mockResolvedValueOnce({ rows: [header({ status: 'CANCELLED' })], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [] }) // _loadItems items
        .mockResolvedValueOnce(undefined); // COMMIT

      const order = await repo.void('so1', 'c1', 'u1');
      expect(order.status).toBe('CANCELLED');
    });

    it('rejects voiding a PAID order (invalid transition)', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.void('so1', 'c1', 'u1')).rejects.toThrow(
        'SALES_ORDER.INVALID_STATUS_TRANSITION',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ── Reads ─────────────────────────────────────────────────────────────
  describe('reads', () => {
    it('getById throws when the order is missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('list returns rows + total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }); // page
      const { rows, total } = await repo.list('c1', { limit: 10, offset: 0, status: 'PAID' });
      expect(total).toBe(1);
      expect(rows).toHaveLength(1);
    });

    it('listProductToppings throws PRODUCT.NOT_FOUND for a missing product', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.listProductToppings('x', 'c1')).rejects.toThrow('PRODUCT.NOT_FOUND');
    });

    it('listPosProducts returns 0 rows gracefully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count
        .mockResolvedValueOnce({ rows: [] }); // page
      const { rows, total } = await repo.listPosProducts('c1', { limit: 50, offset: 0 });
      expect(total).toBe(0);
      expect(rows).toEqual([]);
    });
  });

  it('InvariantError is thrown via the right type for insufficient stock', () => {
    expect(new InvariantError('INVENTORY.INSUFFICIENT_STOCK')).toBeInstanceOf(InvariantError);
  });
});
