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
    // resetAllMocks (not clearAllMocks): several tests deliberately queue a
    // mockResolvedValueOnce that the resolver must NEVER consume (the ACTIVE
    // recipe an untopped line is forbidden to look for). clearAllMocks keeps
    // that once-queue alive, so the leftover value would silently feed the
    // next test's first query and cascade failures across the whole file.
    jest.resetAllMocks();
    repo = new SalesOrderRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  // ── Mode resolution (§3.0) ──────────────────────────────────────────────
  // POS never auto-backflushes: EVERY line (topped or not) is served from the
  // sellable finished-goods stock at the outlet, or rejected. Toppings no
  // longer force MADE_TO_ORDER — they ride on top of whichever mode is used.
  describe('resolveCheckoutItems', () => {
    /** SQL of every pool.query call whose text contains `fragment`. */
    function sqls(fragment: string): string[] {
      return (mockPool.query as jest.Mock).mock.calls
        .filter((c) => typeof c[0] === 'string' && c[0].includes(fragment))
        .map((c) => c[0] as string);
    }

    /** Occurrences of `needle` inside `sql` (structural SQL assertions). */
    function count(sql: string, needle: string): number {
      return sql.split(needle).length - 1;
    }

    /** Untopped-line stock row: sellable + expired sums over the batches. */
    function stockRow(sellable: string, expired: string) {
      return { rows: [{ sellable_qty: sellable, expired_qty: expired }], rowCount: 1 };
    }

    const untopped = (productId: string, qty: number) => ({
      productId,
      qty,
      itemDiscount: 0,
      toppings: [],
    });

    describe('untopped lines — stock or reject, never MADE_TO_ORDER', () => {
      it('resolves STOCK when sellable stock covers qty', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          }) // product
          .mockResolvedValueOnce(stockRow('10', '0')); // sellable covers qty

        const { items } = await repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 2)]);

        expect(items[0].saleMode).toBe('STOCK');
        expect(items[0].recipeId).toBeNull();
        expect(items[0].unitPriceSnapshot).toBe(8000);
        expect(items[0].lineTotal).toBe(16000);
      });

      it('does not consult the recipe table at all for an untopped line', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('10', '0'))
          // A recipe exists — but an untopped line must never reach for it.
          .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 });

        const { items } = await repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 2)]);

        expect(items[0].saleMode).toBe('STOCK');
        expect(sqls('FROM recipes')).toHaveLength(0);
        expect(mockPool.query).toHaveBeenCalledTimes(2);
      });

      it('guards BOTH stock sums with qty_available > 0 so drained expired batches are ignored', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('10', '0'));

        await repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 2)]);

        const stockSql = sqls('FROM inventory_batches');
        expect(stockSql).toHaveLength(1);
        // One guard per FILTER: an expired batch with qty_available = 0 must
        // not be counted, otherwise expiredQty would explain nothing.
        expect(count(stockSql[0], 'qty_available > 0')).toBe(2);
        expect(count(stockSql[0], "status = 'ACTIVE'")).toBe(2);
        expect(stockSql[0]).toContain('expired_date >= CURRENT_DATE');
        expect(stockSql[0]).toContain('expired_date < CURRENT_DATE');
        expect(stockSql[0]).toContain('AS sellable_qty');
        expect(stockSql[0]).toContain('AS expired_qty');
      });

      it('resolves STOCK for a FINISHED_GOODS line and snapshots the line total', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p2', name: 'Air Mineral', selling_price: '5000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('10', '3')); // 3 expired units are irrelevant

        const { items } = await repo.resolveCheckoutItems('c1', 'o1', [untopped('p2', 3)]);

        expect(items[0].saleMode).toBe('STOCK');
        expect(items[0].recipeId).toBeNull();
        expect(items[0].lineTotal).toBe(15000);
      });

      it('rejects SALES_ORDER.STOCK_EXPIRED when every batch on hand is expired', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('0', '5')); // 0 sellable, 5 expired

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 2)]),
        ).rejects.toThrow('SALES_ORDER.STOCK_EXPIRED');
      });

      it('rejects SALES_ORDER.STOCK_EXPIRED when sellable stock is short and expired stock remains', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('1', '4')); // qty 5 requested

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 5)]),
        ).rejects.toThrow('SALES_ORDER.STOCK_EXPIRED');
      });

      it('rejects SALES_ORDER.STOCK_EXPIRED as an InvariantError (HTTP 400)', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('0', '5'));

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 2)]),
        ).rejects.toBeInstanceOf(InvariantError);
      });

      it('rejects INVENTORY.INSUFFICIENT_STOCK with no stock at all, even when an ACTIVE recipe exists', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('0', '0'))
          // An ACTIVE recipe exists — POS must NOT backflush it into a sale.
          .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 });

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 2)]),
        ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
        expect(sqls('FROM recipes')).toHaveLength(0);
      });

      it('rejects INVENTORY.INSUFFICIENT_STOCK when sellable stock is short and nothing is expired', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Waffle', selling_price: '8000.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('1', '0')) // qty 5 requested
          .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 }); // unused recipe

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [untopped('p1', 5)]),
        ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
      });

      it('rejects INVENTORY.INSUFFICIENT_STOCK for a zero-priced product with no stock', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: 'p3', name: 'Tepung', selling_price: '0.00' }],
            rowCount: 1,
          })
          .mockResolvedValueOnce(stockRow('0', '0'));

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [untopped('p3', 1)]),
        ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
      });
    });

    describe('topped lines — stock-first, exactly like untopped ones', () => {
      // Topping-capable product row: the resolver reads name/price/flag only —
      // product_type is no longer part of the query.
      function toppingProduct(over: Record<string, unknown> = {}) {
        return {
          rows: [
            { id: 'p1', name: 'Waffle', selling_price: '8000.00', has_toppings: true, ...over },
          ],
          rowCount: 1,
        };
      }
      const topped = (productId: string, qty: number, toppingProductId = 't1') => ({
        productId,
        qty,
        itemDiscount: 0,
        toppings: [{ toppingProductId }],
      });
      /** Global catalog hit for topping t1 (25 g per item, +2000). */
      const catalogHit = {
        rows: [
          {
            topping_product_id: 't1',
            topping_name: 'Selai',
            default_qty_per_item: '25.000',
            extra_price: '2000.00',
          },
        ],
        rowCount: 1,
      };

      it('resolves STOCK when sellable stock covers a topped line (topping does NOT force MADE_TO_ORDER)', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(toppingProduct()) // product
          .mockResolvedValueOnce(stockRow('10', '0')) // sellable covers qty
          .mockResolvedValueOnce(catalogHit); // topping in global catalog

        const { items } = await repo.resolveCheckoutItems('c1', 'o1', [topped('p1', 2)]);

        expect(items[0].saleMode).toBe('STOCK');
        // No recipe is snapshotted: the resolver has no recipe fallback.
        expect(items[0].recipeId).toBeNull();
        expect(items[0].toppings).toHaveLength(1);
        expect(items[0].toppings[0].toppingProductId).toBe('t1');
        // The stock query MUST run for a topped line — that is the whole fix.
        expect(sqls('FROM inventory_batches')).toHaveLength(1);
        expect(sqls('FROM recipes')).toHaveLength(0);
      });

      it('rejects INVENTORY.INSUFFICIENT_STOCK for a topped line with no stock (no recipe fallback)', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(toppingProduct())
          .mockResolvedValueOnce(stockRow('0', '0'))
          // An ACTIVE recipe exists — POS must NOT backflush it into a sale.
          .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 });

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [topped('p1', 2)]),
        ).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
        expect(sqls('FROM recipes')).toHaveLength(0);
      });

      it('rejects SALES_ORDER.STOCK_EXPIRED for a topped line whose only stock is expired', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(toppingProduct())
          .mockResolvedValueOnce(stockRow('0', '5'));

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [topped('p1', 1)]),
        ).rejects.toThrow('SALES_ORDER.STOCK_EXPIRED');
      });

      it('rejects TOPPING.NOT_ALLOWED when a STOCK product has has_toppings=false', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(
            toppingProduct({ id: 'p2', name: 'Air Mineral', selling_price: '5000.00', has_toppings: false }),
          )
          .mockResolvedValueOnce(stockRow('10', '0')); // stock covers → mode STOCK

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [topped('p2', 1)]),
        ).rejects.toThrow('TOPPING.NOT_ALLOWED');
      });

      it('rejects TOPPING.NOT_ALLOWED when a topping is not in the active global catalog', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(toppingProduct())
          .mockResolvedValueOnce(stockRow('10', '0'))
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // not in catalog

        await expect(
          repo.resolveCheckoutItems('c1', 'o1', [topped('p1', 1, 'tX')]),
        ).rejects.toThrow('TOPPING.NOT_ALLOWED');
      });

      it('snapshots global topping price into the line total on a STOCK line', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(toppingProduct())
          .mockResolvedValueOnce(stockRow('10', '0'))
          .mockResolvedValueOnce(catalogHit);

        const { items } = await repo.resolveCheckoutItems('c1', 'o1', [topped('p1', 2)]);
        // (8000 + 2000) * 2 = 20000
        expect(items[0].saleMode).toBe('STOCK');
        expect(items[0].toppingsPrice).toBe(2000);
        expect(items[0].lineTotal).toBe(20000);
        expect(items[0].toppings[0].qtyPerItem).toBe(25);
      });
    });

    it('rejects PRODUCT.NOT_FOUND for a missing product', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(
        repo.resolveCheckoutItems('c1', 'o1', [{ productId: 'x', qty: 1, itemDiscount: 0, toppings: [] }]),
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
        .mockResolvedValueOnce({ rows: [] }) // item toppings (none on this line)
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
        .mockResolvedValueOnce({ rows: [] }) // item toppings (none on this line)
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
        .mockResolvedValueOnce({ rows: [] }) // item toppings (none on this line)
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

    // The bug this fixes: a topped line used to be forced to MADE_TO_ORDER, so
    // pay() backflushed recipe ingredients and the finished-goods batch was
    // never cut. Now topping consumption is mode-independent.
    it('cuts BOTH the finished product and the topping on a STOCK line', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ grand_total: '20000.00' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'it1',
              product_id: 'p1',
              sale_mode: 'STOCK',
              recipe_id: null,
              product_name_snapshot: 'Waffle',
              unit_price_snapshot: '8000.00',
              qty: '2.000',
              item_discount: '0.00',
              toppings_price: '2000.00',
              line_total: '20000.00',
            },
          ],
        }) // load items — STOCK despite the topping
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
        // target 1: the product itself → 2 (STOCK line, NOT recipe ingredients)
        .mockResolvedValueOnce({ rows: [{ id: 'b1', qty_available: '10.000' }] }) // FEFO p1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rows: [{ id: 'mv1' }], rowCount: 1 }) // movement
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption
        // target 2: the topping → 25 * 2 = 50
        .mockResolvedValueOnce({ rows: [{ id: 'b2', qty_available: '100.000' }] }) // FEFO t1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch
        .mockResolvedValueOnce({ rows: [{ id: 'mv2' }], rowCount: 1 }) // movement
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // payment insert
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID' })], rowCount: 1 }) // update header
        .mockResolvedValueOnce({ rows: [] }) // _loadItems items
        .mockResolvedValueOnce({ rows: [] }) // _loadPayments
        .mockResolvedValueOnce(undefined); // COMMIT

      const order = await repo.pay('so1', 'c1', 'u1', [
        { method: 'CASH', amount: 20000, referenceNo: null },
      ]);
      expect(order.status).toBe('PAID');

      const batchUpdateCalls = client.query.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('UPDATE inventory_batches'),
      );
      expect(batchUpdateCalls).toHaveLength(2);
      // product 10 - 2 = 8, topping 100 - 50 = 50
      expect(Number(batchUpdateCalls[0][1][0])).toBeCloseTo(8);
      expect(Number(batchUpdateCalls[1][1][0])).toBeCloseTo(50);
      // No recipe backflush happened on this STOCK line.
      expect(
        client.query.mock.calls.filter((c) => typeof c[0] === 'string' && c[0].includes('FROM recipe_items')),
      ).toHaveLength(0);

      // Verify source_document_item_id differentiation: product uses it1, topping uses tp1
      const movementCalls = client.query.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO inventory_movements'),
      );
      expect(movementCalls).toHaveLength(2);
      expect(movementCalls[0][1][8]).toBe('it1');
      expect(movementCalls[1][1][8]).toBe('tp1');

      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('does NOT collide on source-key when product and topping consume from the same batch', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ grand_total: '20000.00' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'it1',
              product_id: 'p1',
              sale_mode: 'STOCK',
              recipe_id: null,
              product_name_snapshot: 'Waffle',
              unit_price_snapshot: '8000.00',
              qty: '2.000',
              item_discount: '0.00',
              toppings_price: '2000.00',
              line_total: '20000.00',
            },
          ],
        }) // load items
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'tp1',
              sales_order_item_id: 'it1',
              topping_product_id: 't1',
              topping_name_snapshot: 'Keju',
              qty_per_item: '1.000',
              extra_price_snapshot: '2000.00',
            },
          ],
        }) // item toppings
        // target 1: product p1 consumes batch b_shared
        .mockResolvedValueOnce({ rows: [{ id: 'b_shared', qty_available: '10.000' }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch b_shared
        .mockResolvedValueOnce({ rows: [{ id: 'mv1' }], rowCount: 1 }) // movement 1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption 1
        // target 2: topping t1 ALSO consumes batch b_shared
        .mockResolvedValueOnce({ rows: [{ id: 'b_shared', qty_available: '8.000' }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch b_shared
        .mockResolvedValueOnce({ rows: [{ id: 'mv2' }], rowCount: 1 }) // movement 2
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // consumption 2
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // payment insert
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID' })], rowCount: 1 }) // update header
        .mockResolvedValueOnce({ rows: [] }) // _loadItems
        .mockResolvedValueOnce({ rows: [] }) // _loadPayments
        .mockResolvedValueOnce(undefined); // COMMIT

      const order = await repo.pay('so1', 'c1', 'u1', [
        { method: 'CASH', amount: 20000, referenceNo: null },
      ]);
      expect(order.status).toBe('PAID');

      const movementCalls = client.query.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO inventory_movements'),
      );
      expect(movementCalls).toHaveLength(2);
      // Both touch batch 'b_shared'
      expect(movementCalls[0][1][9]).toBe('b_shared');
      expect(movementCalls[1][1][9]).toBe('b_shared');
      // But their source_document_item_id are distinct ('it1' vs 'tp1') preventing 23505 collision
      expect(movementCalls[0][1][8]).toBe('it1');
      expect(movementCalls[1][1][8]).toBe('tp1');
      expect(movementCalls[0][1][8]).not.toBe(movementCalls[1][1][8]);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
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
        .mockResolvedValueOnce({
          rows: [header({ outlet_name: 'Outlet Utama', cashier_name: 'Kasir Satu' })],
          rowCount: 1,
        }); // page
      const { rows, total } = await repo.list('c1', { limit: 10, offset: 0, status: 'PAID' });
      expect(total).toBe(1);
      expect(rows).toHaveLength(1);
      expect(rows[0].outletName).toBe('Outlet Utama');
      expect(rows[0].cashierName).toBe('Kasir Satu');
      const pageQuery = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(pageQuery).toContain('AS outlet_name');
      expect(pageQuery).toContain('AS cashier_name');
      expect(pageQuery).toContain('u.company_id = sales_orders.company_id');
    });

    it('list scopes sales orders to the requested cashier when cashierUserId is provided', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 });

      await repo.list('c1', { limit: 10, offset: 0, cashierUserId: 'u1' });

      const countQuery = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      const pageQuery = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      expect(countQuery).toContain('cashier_user_id = $2');
      expect(pageQuery).toContain('cashier_user_id = $2');
      expect((mockPool.query as jest.Mock).mock.calls[0][1].slice(0, 2)).toEqual(['c1', 'u1']);
      expect((mockPool.query as jest.Mock).mock.calls[1][1]).toEqual(['c1', 'u1', 10, 0]);
    });

    it('listActiveToppings maps the active global catalog rows + per-outlet stock figures', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            topping_product_id: 't1',
            topping_name: 'Selai',
            default_qty_per_item: '25.000',
            extra_price: '2000.00',
            sort_order: 0,
            available_qty: '30',
            expired_qty: '5',
          },
        ],
      });
      const toppings = await repo.listActiveToppings('c1', 'o1');
      expect(toppings).toHaveLength(1);
      expect(toppings[0].toppingProductId).toBe('t1');
      expect(toppings[0].defaultQtyPerItem).toBe(25);
      expect(toppings[0].extraPrice).toBe(2000);
      // Non-expired stock surfaces as availableQty, expired as expiredQty.
      expect(toppings[0].availableQty).toBe(30);
      expect(toppings[0].expiredQty).toBe(5);
      // The outlet is forwarded as the 2nd parameter to the stock subqueries.
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual(['c1', 'o1']);
    });

    it('listActiveToppings defaults stock figures to 0 when the SUMs come back null', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            topping_product_id: 't1',
            topping_name: 'Selai',
            default_qty_per_item: '25.000',
            extra_price: '2000.00',
            sort_order: 0,
            available_qty: null,
            expired_qty: null,
          },
        ],
      });
      const toppings = await repo.listActiveToppings('c1', 'o1');
      expect(toppings[0].availableQty).toBe(0);
      expect(toppings[0].expiredQty).toBe(0);
    });

    it('listActiveToppings passes outletId = null when absent (safe degradation, no stock)', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            topping_product_id: 't1',
            topping_name: 'Selai',
            default_qty_per_item: '25.000',
            extra_price: '2000.00',
            sort_order: 0,
            available_qty: '0',
            expired_qty: '0',
          },
        ],
      });
      const toppings = await repo.listActiveToppings('c1');
      expect(toppings[0].availableQty).toBe(0);
      expect(toppings[0].expiredQty).toBe(0);
      // No outlet → the stock param is NULL so both correlated SUMs collapse.
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual(['c1', null]);
    });

    it('listActiveToppings reuses the same batch filters/outlet param as the product grid', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.listActiveToppings('c1', 'o1');

      const sql = (mockPool.query as jest.Mock).mock.calls[0][0] as string;
      // Same trap as the product grid: BOTH correlated sums need the
      // qty_available > 0 + ACTIVE guards, and both must point at the single
      // $2::uuid outlet placeholder.
      const guardCount = (needle: string) => sql.split(needle).length - 1;
      expect(guardCount('ib.qty_available > 0')).toBe(2);
      expect(guardCount("ib.status = 'ACTIVE'")).toBe(2);
      expect(sql).toContain('AS available_qty');
      expect(sql).toContain('AS expired_qty');
      expect(sql).toContain('ib.expired_date >= CURRENT_DATE');
      expect(sql).toContain('ib.expired_date IS NOT NULL AND ib.expired_date < CURRENT_DATE');
      const placeholders = sql.match(/\$\d+::uuid/g) as string[];
      expect(placeholders).toHaveLength(2);
      expect(placeholders[0]).toBe('$2::uuid');
      expect(placeholders[1]).toBe('$2::uuid');
    });

    it('listPosProducts returns 0 rows gracefully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count
        .mockResolvedValueOnce({ rows: [] }); // page
      const { rows, total } = await repo.listPosProducts('c1', { limit: 50, offset: 0 });
      expect(total).toBe(0);
      expect(rows).toEqual([]);
    });

    it('listPosProducts maps availableQty, expiredQty and STOCK/MTO modes', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // count
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'p1',
              sku: 'SKU-WAFFLE-1',
              name: 'Waffle Original',
              product_type: 'FINISHED_GOODS',
              selling_price: '8000.00',
              has_toppings: true,
              recipe_id: 'r1',
              available_qty: '12',
              expired_qty: '4',
            },
            {
              id: 'p2',
              sku: 'SKU-TEA-1',
              name: 'Es Teh',
              product_type: 'FINISHED_GOODS',
              selling_price: '5000.00',
              has_toppings: false,
              recipe_id: null,
              available_qty: null,
              expired_qty: null,
            },
          ],
        }); // page
      const { rows, total } = await repo.listPosProducts('c1', {
        limit: 50,
        offset: 0,
        outletId: 'o1',
      });
      expect(total).toBe(2);
      expect(rows[0].saleMode).toBe('MADE_TO_ORDER');
      expect(rows[0].availableQty).toBe(12);
      expect(rows[0].expiredQty).toBe(4);
      expect(rows[1].saleMode).toBe('STOCK');
      expect(rows[1].availableQty).toBe(0);
      expect(rows[1].expiredQty).toBe(0);
    });

    it('listPosProducts guards expiredQty with qty_available > 0 so drained expired batches do not count', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count
        .mockResolvedValueOnce({ rows: [] }); // page

      await repo.listPosProducts('c1', { limit: 50, offset: 0, outletId: 'o1', search: 'waffle' });

      const sql = (mockPool.query as jest.Mock).mock.calls[1][0] as string;
      // The trap: an expired batch with qty_available = 0 must not inflate
      // expired_qty, so BOTH correlated sums need the qty_available > 0 guard.
      const guardCount = (needle: string) => sql.split(needle).length - 1;
      expect(guardCount('ib.qty_available > 0')).toBe(2);
      expect(guardCount("ib.status = 'ACTIVE'")).toBe(2);
      expect(sql).toContain('AS available_qty');
      expect(sql).toContain('AS expired_qty');
      expect(sql).toContain('ib.expired_date >= CURRENT_DATE');
      expect(sql).toContain('ib.expired_date IS NOT NULL AND ib.expired_date < CURRENT_DATE');
      // Both subqueries must reuse the SAME dynamically-built outlet placeholder
      // (params.length + 1), never a hardcoded parameter number.
      const placeholders = sql.match(/\$\d+::uuid/g) as string[];
      expect(placeholders).toHaveLength(2);
      expect(placeholders[0]).toBe(placeholders[1]);
      const limitIndex = Number((sql.match(/LIMIT \$(\d+)/) as RegExpMatchArray)[1]);
      expect(placeholders[0]).toBe(`$${limitIndex + 2}::uuid`);
    });
  });

  // ── Refund (PAID -> REFUNDED, full-order) ────────────────────────────────
  describe('refund', () => {
    function orderItemRow(over: Record<string, unknown> = {}) {
      return {
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
        ...over,
      };
    }
    function returnHeaderRow(over: Record<string, unknown> = {}) {
      return {
        id: 'ret1',
        company_id: 'c1',
        outlet_id: 'out1',
        sales_order_id: 'so1',
        reason: null,
        refund_amount: '15000.00',
        status: 'COMPLETED',
        returned_by: 'u1',
        created_at: new Date(),
        updated_at: new Date(),
        ...over,
      };
    }

    it('returns consumed stock to the ORIGINAL batch via SALE_RETURN and flips to REFUNDED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID', grand_total: '15000.00' })], rowCount: 1 }) // lock order (PAID)
        .mockResolvedValueOnce({ rows: [returnHeaderRow()], rowCount: 1 }) // insert sales_returns
        .mockResolvedValueOnce({ rows: [orderItemRow()], rowCount: 1 }) // load order items
        .mockResolvedValueOnce({ rows: [{ id: 'rit1' }], rowCount: 1 }) // insert sales_return_items
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'sc1',
              sales_order_item_id: 'it1',
              product_id: 'p2',
              batch_id: 'b1',
              qty_consumed: '3.000',
            },
          ],
        }) // load consumptions
        .mockResolvedValueOnce({ rows: [{ qty_available: '0.000' }], rowCount: 1 }) // reload batch (was CONSUMED)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch (reactivate)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert SALE_RETURN movement
        .mockResolvedValueOnce({ rows: [header({ status: 'REFUNDED' })], rowCount: 1 }) // update order
        .mockResolvedValueOnce({ rows: [{ id: 'rit1', sales_order_item_id: 'it1', qty_returned: '3.000', refund_line_amount: '15000.00' }] }) // _loadReturnItems
        .mockResolvedValueOnce({ rows: [] }) // _loadItems items
        .mockResolvedValueOnce({ rows: [] }) // _loadPayments
        .mockResolvedValueOnce(undefined); // COMMIT

      const { order, salesReturn } = await repo.refund('so1', 'c1', 'u1', null);

      expect(order.status).toBe('REFUNDED');
      expect(salesReturn.refundAmount).toBe(15000);
      expect(salesReturn.status).toBe('COMPLETED');

      // SALE_RETURN inbound movement posted to the original batch, qty 3.
      const movementCall = client.query.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes("'SALE_RETURN'"),
      );
      expect(movementCall).toBeDefined();
      expect(movementCall![0]).toContain("'SALES_RETURN'");
      // before 0 + 3 = after 3 (batch_id b1, qty 3).
      expect(movementCall![1][2]).toBe('b1'); // batch_id
      expect(Number(movementCall![1][4])).toBeCloseTo(3); // qty
      expect(Number(movementCall![1][6])).toBeCloseTo(3); // after_qty

      // Batch update reactivates a CONSUMED batch when qty becomes > 0.
      const batchUpdate = client.query.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('UPDATE inventory_batches'),
      );
      expect(batchUpdate![0]).toContain("status = CASE WHEN status = 'CONSUMED'");
      expect(Number(batchUpdate![1][0])).toBeCloseTo(3);

      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rejects refunding an order that is not PAID (SALES_ORDER.NOT_PAID)', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'PENDING_PAYMENT' })], rowCount: 1 }) // lock → not PAID
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.refund('so1', 'c1', 'u1', null)).rejects.toThrow('SALES_ORDER.NOT_PAID');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('rejects double refund (SALES_ORDER.ALREADY_REFUNDED)', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'REFUNDED' })], rowCount: 1 }) // lock → already REFUNDED
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.refund('so1', 'c1', 'u1', null)).rejects.toBeInstanceOf(ConflictError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('throws SALES_ORDER.NOT_FOUND when the order is missing', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // lock → none
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.refund('x', 'c1', 'u1', null)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('maps a duplicate SALE_RETURN source key 23505 to INVENTORY.DUPLICATE_MOVEMENT_SOURCE', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET ISOLATION
        .mockResolvedValueOnce({ rows: [header({ status: 'PAID', grand_total: '15000.00' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({ rows: [returnHeaderRow()], rowCount: 1 }) // insert sales_returns
        .mockResolvedValueOnce({ rows: [orderItemRow()], rowCount: 1 }) // load order items
        .mockResolvedValueOnce({ rows: [{ id: 'rit1' }], rowCount: 1 }) // insert return item
        .mockResolvedValueOnce({
          rows: [
            { id: 'sc1', sales_order_item_id: 'it1', product_id: 'p2', batch_id: 'b1', qty_consumed: '3.000' },
          ],
        }) // consumptions
        .mockResolvedValueOnce({ rows: [{ qty_available: '0.000' }], rowCount: 1 }) // reload batch
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update batch
        .mockRejectedValueOnce({ code: '23505' }) // SALE_RETURN movement collides
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.refund('so1', 'c1', 'u1', null)).rejects.toThrow(
        'INVENTORY.DUPLICATE_MOVEMENT_SOURCE',
      );
    });

    it('getReturnByOrderId returns null when there is no refund', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await repo.getReturnByOrderId('so1', 'c1');
      expect(result).toBeNull();
    });

    it('getReturnByOrderId returns the latest refund with its items', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [returnHeaderRow()], rowCount: 1 }) // header
        .mockResolvedValueOnce({
          rows: [{ id: 'rit1', sales_order_item_id: 'it1', qty_returned: '3.000', refund_line_amount: '15000.00' }],
        }); // items
      const result = await repo.getReturnByOrderId('so1', 'c1');
      expect(result).not.toBeNull();
      expect(result!.refundAmount).toBe(15000);
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].qtyReturned).toBe(3);
    });
  });

  it('InvariantError is thrown via the right type for insufficient stock', () => {
    expect(new InvariantError('INVENTORY.INSUFFICIENT_STOCK')).toBeInstanceOf(InvariantError);
  });
});
