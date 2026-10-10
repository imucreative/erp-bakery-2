import { Pool, PoolClient } from 'pg';
import {
  SalesOrderRepository,
  NewSalesOrderData,
  SalesOrderListFilter,
  SalesOrderListResult,
  PaymentInput,
  CheckoutItemRequest,
  ResolveCheckoutResult,
  ResolvedSalesOrderItem,
  ResolvedSalesOrderItemTopping,
  PosProductFilter,
  PosProductResult,
  PosProduct,
  PosToppingOption,
  SalesRefundResult,
} from '../../Domains/sales/SalesOrderRepository';
import {
  SalesOrder,
  SalesOrderItem,
  SalesOrderItemTopping,
  SalesPayment,
} from '../../Domains/sales/entities/SalesOrder';
import {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatus,
} from '../../Domains/sales/entities/SalesReturn';
import { SalesOrderStatus } from '../../Domains/sales/salesOrderStatus';
import { SaleMode } from '../../Domains/sales/saleMode';
import { PaymentMethod } from '../../Domains/sales/paymentMethod';
import { scaledIngredientConsumption } from '../../Domains/production/productionConsumption';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface HeaderRow {
  id: string;
  company_id: string;
  outlet_id: string;
  shift_id: string;
  invoice_number: string;
  customer_name: string | null;
  order_date: Date;
  status: string;
  item_count: number;
  subtotal: string;
  order_discount: string;
  tax: string;
  grand_total: string;
  cashier_user_id: string;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  product_id: string;
  sale_mode: string;
  recipe_id: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: string;
  qty: string;
  item_discount: string;
  toppings_price: string;
  line_total: string;
}

interface ItemToppingRow {
  id: string;
  sales_order_item_id: string;
  topping_product_id: string;
  topping_name_snapshot: string;
  qty_per_item: string;
  extra_price_snapshot: string;
}

interface PaymentRow {
  id: string;
  payment_method: string;
  amount: string;
  reference_no: string | null;
  paid_at: Date;
}

interface RecipeItemRow {
  id: string;
  ingredient_product_id: string;
  qty: string;
}

interface BatchRow {
  id: string;
  qty_available: string;
}

interface SalesConsumptionRow {
  id: string;
  sales_order_item_id: string;
  product_id: string;
  batch_id: string;
  qty_consumed: string;
}

interface SalesReturnHeaderRow {
  id: string;
  company_id: string;
  outlet_id: string;
  sales_order_id: string;
  reason: string | null;
  refund_amount: string;
  status: string;
  returned_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface SalesReturnItemRow {
  id: string;
  sales_order_item_id: string;
  qty_returned: string;
  refund_line_amount: string;
}

const RETURN_HEADER_COLUMNS = `id, company_id, outlet_id, sales_order_id, reason,
  refund_amount, status, returned_by, created_at, updated_at`;

const HEADER_COLUMNS = `id, company_id, outlet_id, shift_id, invoice_number, customer_name,
  order_date, status, item_count, subtotal, order_discount, tax, grand_total,
  cashier_user_id, paid_at, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of SalesOrderRepository (POS Fase 2).
 * Raw SQL via pg — no ORM. Company-scoped + outlet-scoped.
 *
 * The pay() path mirrors ProductionOrderRepositoryPostgres.createInstant: one
 * SERIALIZABLE transaction performs FEFO deduction (nearest-expiry, non-expired,
 * ACTIVE, qty>0, FOR UPDATE, across batches), SALE movement append with source
 * keys, consumption snapshot, payment insert, and the PAID status flip. The
 * ingredient consumption formula is reused from productionConsumption.ts (never
 * duplicated).
 */
export class SalesOrderRepositoryPostgres extends SalesOrderRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  // ── Mappers ──────────────────────────────────────────────────────────────

  private _toTopping(row: ItemToppingRow): SalesOrderItemTopping {
    return {
      id: row.id,
      toppingProductId: row.topping_product_id,
      toppingNameSnapshot: row.topping_name_snapshot,
      qtyPerItem: Number(row.qty_per_item),
      extraPriceSnapshot: Number(row.extra_price_snapshot),
    };
  }

  private _toItem(row: ItemRow, toppings: SalesOrderItemTopping[]): SalesOrderItem {
    return {
      id: row.id,
      productId: row.product_id,
      saleMode: row.sale_mode as SaleMode,
      recipeId: row.recipe_id,
      productNameSnapshot: row.product_name_snapshot,
      unitPriceSnapshot: Number(row.unit_price_snapshot),
      qty: Number(row.qty),
      itemDiscount: Number(row.item_discount),
      toppingsPrice: Number(row.toppings_price),
      lineTotal: Number(row.line_total),
      toppings,
    };
  }

  private _toPayment(row: PaymentRow): SalesPayment {
    return {
      id: row.id,
      paymentMethod: row.payment_method as PaymentMethod,
      amount: Number(row.amount),
      referenceNo: row.reference_no,
      paidAt: row.paid_at,
    };
  }

  private _toOrder(
    header: HeaderRow,
    items: SalesOrderItem[] = [],
    payments: SalesPayment[] = [],
  ): SalesOrder {
    return new SalesOrder({
      id: header.id,
      companyId: header.company_id,
      outletId: header.outlet_id,
      shiftId: header.shift_id,
      invoiceNumber: header.invoice_number,
      customerName: header.customer_name,
      orderDate: header.order_date,
      status: header.status as SalesOrderStatus,
      itemCount: Number(header.item_count),
      subtotal: Number(header.subtotal),
      orderDiscount: Number(header.order_discount),
      tax: Number(header.tax),
      grandTotal: Number(header.grand_total),
      cashierUserId: header.cashier_user_id,
      paidAt: header.paid_at,
      items,
      payments,
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  private async _loadItems(
    client: PoolClient | Pool,
    orderId: string,
  ): Promise<SalesOrderItem[]> {
    const itemsResult = await client.query<ItemRow>(
      `SELECT id, product_id, sale_mode, recipe_id, product_name_snapshot,
              unit_price_snapshot, qty, item_discount, toppings_price, line_total
       FROM sales_order_items
       WHERE sales_order_id = $1
       ORDER BY created_at ASC`,
      [orderId],
    );
    if (itemsResult.rows.length === 0) return [];

    const itemIds = itemsResult.rows.map((r) => r.id);
    const toppingsResult = await client.query<ItemToppingRow>(
      `SELECT id, sales_order_item_id, topping_product_id, topping_name_snapshot,
              qty_per_item, extra_price_snapshot
       FROM sales_order_item_toppings
       WHERE sales_order_item_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [itemIds],
    );
    const toppingsByItem = new Map<string, SalesOrderItemTopping[]>();
    for (const row of toppingsResult.rows) {
      const list = toppingsByItem.get(row.sales_order_item_id) ?? [];
      list.push(this._toTopping(row));
      toppingsByItem.set(row.sales_order_item_id, list);
    }

    return itemsResult.rows.map((row) =>
      this._toItem(row, toppingsByItem.get(row.id) ?? []),
    );
  }

  private async _loadPayments(
    client: PoolClient | Pool,
    orderId: string,
  ): Promise<SalesPayment[]> {
    const result = await client.query<PaymentRow>(
      `SELECT id, payment_method, amount, reference_no, paid_at
       FROM sales_payments
       WHERE sales_order_id = $1
       ORDER BY paid_at ASC, created_at ASC`,
      [orderId],
    );
    return result.rows.map((r) => this._toPayment(r));
  }

  /** INV-YYYYMMDD-XXXXXX, counter per company + day (doc 35 §2). */
  private async _generateInvoiceNumber(
    client: PoolClient,
    companyId: string,
  ): Promise<string> {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${ymd}-`;
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sales_orders
       WHERE company_id = $1 AND invoice_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  // ── Deterministic checkout resolution (§3.0 / §7.1) ────────────────────────

  async resolveCheckoutItems(
    companyId: string,
    outletId: string,
    items: CheckoutItemRequest[],
  ): Promise<ResolveCheckoutResult> {
    const resolved: ResolvedSalesOrderItem[] = [];

    for (const req of items) {
      // Load the sellable product (must belong to the company, not deleted).
      const productResult = await this.pool.query<{
        id: string;
        name: string;
        selling_price: string;
        has_toppings: boolean;
      }>(
        `SELECT id, name, selling_price, has_toppings
         FROM products
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [req.productId, companyId],
      );
      if (!productResult.rowCount) {
        throw new NotFoundError('PRODUCT.NOT_FOUND');
      }
      const product = productResult.rows[0];

      // Mode resolution — ONE stock-first rule for EVERY line, topped or not.
      // POS never backflushes raw materials: backflush only happens through a
      // Production Order, so a line is either served from the sellable
      // finished-goods stock at the outlet or rejected outright. Toppings no
      // longer change this: a topped line is cut from the SAME finished-goods
      // batch as an untopped one, and pay() consumes the toppings on top.
      //
      // Two independent sums over the product's batches at this outlet (same
      // source as Stock On Hand). Both filters require qty_available > 0,
      // otherwise an expired batch that has already been fully consumed would
      // inflate expiredQty with a meaningless number.
      const stockResult = await this.pool.query<{
        sellable_qty: string;
        expired_qty: string;
      }>(
        `SELECT COALESCE(SUM(qty_available) FILTER (
                  WHERE status = 'ACTIVE' AND qty_available > 0
                    AND (expired_date IS NULL OR expired_date >= CURRENT_DATE)
              ), 0) AS sellable_qty,
                COALESCE(SUM(qty_available) FILTER (
                  WHERE status = 'ACTIVE' AND qty_available > 0
                    AND expired_date IS NOT NULL AND expired_date < CURRENT_DATE
              ), 0) AS expired_qty
         FROM inventory_batches
         WHERE company_id = $1 AND outlet_id = $2 AND product_id = $3`,
        [companyId, outletId, req.productId],
      );
      const sellableQty = Number(stockResult.rows[0]?.sellable_qty ?? 0);
      const expiredQty = Number(stockResult.rows[0]?.expired_qty ?? 0);

      let saleMode: SaleMode;
      // No resolver decision ever snapshots a recipe: stock-first has no
      // recipe fallback. The column stays (pay() still serves orders already
      // persisted as MADE_TO_ORDER, and refund() reads it back) but it is
      // always null on a freshly resolved line.
      const recipeId: string | null = null;

      if (sellableQty >= req.qty && req.qty > 0) {
        // Sellable stock covers the line → cut the finished batch at pay().
        saleMode = 'STOCK';
      } else if (expiredQty > 0) {
        // Stock exists but none of it is sellable anymore. Say so instead of
        // reporting a plain shortage: the fix is a new Production Order.
        throw new InvariantError('SALES_ORDER.STOCK_EXPIRED');
      } else {
        // Nothing on hand (or qty = 0). POS never backflushes, so there is no
        // recipe fallback — reject with the existing shortage code.
        throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
      }

      // Validate + snapshot toppings against the GLOBAL catalog (model global,
      // doc 51 §2.1/§3.4/§7.1). Toppings are allowed on EVERY sale mode — the
      // only product-side gate is the has_toppings flag; a product that does
      // not accept toppings rejects TOPPING.NOT_ALLOWED whatever the mode is.
      const resolvedToppings: ResolvedSalesOrderItemTopping[] = [];
      let toppingsPrice = 0;

      if (req.toppings.length > 0 && !product.has_toppings) {
        throw new InvariantError('TOPPING.NOT_ALLOWED');
      }

      for (const t of req.toppings) {
        const catalogResult = await this.pool.query<{
          topping_product_id: string;
          topping_name: string;
          default_qty_per_item: string;
          extra_price: string;
        }>(
          `SELECT tg.topping_product_id,
                  tp.name AS topping_name,
                  tg.default_qty_per_item,
                  tg.extra_price
           FROM toppings tg
           JOIN products tp ON tp.id = tg.topping_product_id
           WHERE tg.company_id = $1 AND tg.topping_product_id = $2
             AND tg.is_active = TRUE AND tg.deleted_at IS NULL`,
          [companyId, t.toppingProductId],
        );
        if (!catalogResult.rowCount) {
          // Topping not registered/active in the global catalog (§7.1).
          throw new InvariantError('TOPPING.NOT_ALLOWED');
        }
        const entry = catalogResult.rows[0];
        const extraPrice = Number(entry.extra_price);
        toppingsPrice += extraPrice;
        resolvedToppings.push({
          toppingProductId: entry.topping_product_id,
          toppingNameSnapshot: entry.topping_name,
          qtyPerItem: Number(entry.default_qty_per_item),
          extraPriceSnapshot: extraPrice,
        });
      }

      const unitPrice = Number(product.selling_price);
      // line_total = (unit_price + toppings_price) * qty - item_discount.
      const rawLineTotal = (unitPrice + toppingsPrice) * req.qty - req.itemDiscount;
      const lineTotal = rawLineTotal < 0 ? 0 : rawLineTotal;

      resolved.push({
        productId: req.productId,
        saleMode,
        recipeId,
        productNameSnapshot: product.name,
        unitPriceSnapshot: unitPrice,
        qty: req.qty,
        itemDiscount: req.itemDiscount,
        toppingsPrice,
        lineTotal,
        toppings: resolvedToppings,
      });
    }

    return { items: resolved };
  }

  // ── Checkout (create PENDING_PAYMENT; no stock) ────────────────────────────

  async createOrder(companyId: string, data: NewSalesOrderData): Promise<SalesOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const invoiceNumber = await this._generateInvoiceNumber(client, companyId);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO sales_orders
           (company_id, outlet_id, shift_id, invoice_number, customer_name,
            status, item_count, subtotal, order_discount, tax, grand_total,
            cashier_user_id, created_by)
         VALUES ($1,$2,$3,$4,$5,'PENDING_PAYMENT',$6,$7,$8,$9,$10,$11,$11)
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          data.outletId,
          data.shiftId,
          invoiceNumber,
          data.customerName,
          data.itemCount,
          data.subtotal,
          data.orderDiscount,
          data.tax,
          data.grandTotal,
          data.cashierUserId,
        ],
      );
      const header = headerResult.rows[0];
      const orderId = header.id;

      for (const item of data.items) {
        const itemResult = await client.query<{ id: string }>(
          `INSERT INTO sales_order_items
             (sales_order_id, product_id, sale_mode, recipe_id, product_name_snapshot,
              unit_price_snapshot, qty, item_discount, toppings_price, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id`,
          [
            orderId,
            item.productId,
            item.saleMode,
            item.recipeId,
            item.productNameSnapshot,
            item.unitPriceSnapshot,
            item.qty,
            item.itemDiscount,
            item.toppingsPrice,
            item.lineTotal,
          ],
        );
        const itemId = itemResult.rows[0].id;

        for (const topping of item.toppings) {
          await client.query(
            `INSERT INTO sales_order_item_toppings
               (sales_order_item_id, topping_product_id, topping_name_snapshot,
                qty_per_item, extra_price_snapshot)
             VALUES ($1,$2,$3,$4,$5)`,
            [
              itemId,
              topping.toppingProductId,
              topping.toppingNameSnapshot,
              topping.qtyPerItem,
              topping.extraPriceSnapshot,
            ],
          );
        }
      }

      const items = await this._loadItems(client, orderId);
      await client.query('COMMIT');
      return this._toOrder(header, items, []);
    } catch (err) {
      await client.query('ROLLBACK');
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new InvariantError('SALES_ORDER.NUMBER_CONFLICT');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Pay + FEFO stock deduction (PENDING_PAYMENT -> PAID), atomic ──────────

  async pay(
    orderId: string,
    companyId: string,
    userId: string | null,
    payments: PaymentInput[],
  ): Promise<SalesOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // 1. Lock the order; assert PENDING_PAYMENT (idempotency guard).
      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM sales_orders
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         FOR UPDATE`,
        [orderId, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('SALES_ORDER.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (header.status === 'PAID') {
        throw new ConflictError('SALES_ORDER.ALREADY_PAID');
      }
      if (header.status !== 'PENDING_PAYMENT') {
        throw new InvariantError('SALES_ORDER.INVALID_STATUS_TRANSITION');
      }

      const outletId = header.outlet_id;
      const bizDate = new Date().toISOString().slice(0, 10);

      // 2. Σ payments == grand_total (tolerate float noise within 0.005).
      const grandTotal = Number(header.grand_total);
      const paidSum = payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(paidSum - grandTotal) > 0.005) {
        throw new InvariantError('PAYMENT.AMOUNT_MISMATCH');
      }

      // Load the order items (+ their toppings) to drive the consumption plan.
      const itemsResult = await client.query<ItemRow>(
        `SELECT id, product_id, sale_mode, recipe_id, product_name_snapshot,
                unit_price_snapshot, qty, item_discount, toppings_price, line_total
         FROM sales_order_items
         WHERE sales_order_id = $1
         ORDER BY created_at ASC`,
        [orderId],
      );

      // 3. Build consumption targets per item, then FEFO-cut each (step 4-6).
      for (const item of itemsResult.rows) {
        const itemId = item.id;
        const itemQty = Number(item.qty);

        // (productId -> requiredQty) consumption targets for THIS item.
        const targets: { productId: string; requiredQty: number }[] = [];

        if (item.sale_mode === 'MADE_TO_ORDER') {
          if (!item.recipe_id) {
            throw new InvariantError('RECIPE.NO_ACTIVE_RECIPE');
          }
          // Recipe yield + ingredient lines → scaled consumption.
          const recipeResult = await client.query<{ yield_qty: string }>(
            `SELECT yield_qty FROM recipes
             WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
            [item.recipe_id, companyId],
          );
          if (!recipeResult.rowCount) {
            throw new NotFoundError('RECIPE.NOT_FOUND');
          }
          const yieldQty = Number(recipeResult.rows[0].yield_qty);
          if (!(yieldQty > 0)) {
            throw new InvariantError('RECIPE.NO_ACTIVE_RECIPE');
          }
          const scaleFactor = itemQty / yieldQty;

          const recipeItems = await client.query<RecipeItemRow>(
            `SELECT id, ingredient_product_id, qty FROM recipe_items WHERE recipe_id = $1`,
            [item.recipe_id],
          );
          for (const ri of recipeItems.rows) {
            // Shared consumption math — loss% is NOT a factor (estimate only).
            const requiredQty = scaledIngredientConsumption(Number(ri.qty), scaleFactor);
            if (requiredQty > 0) {
              targets.push({ productId: ri.ingredient_product_id, requiredQty });
            }
          }
        } else {
          // STOCK: cut the sellable product's own finished-goods stock.
          targets.push({ productId: item.product_id, requiredQty: itemQty });
        }

        // Topping consumption — OUTSIDE the mode branch, because a topping is
        // consumed in BOTH modes (qty_per_item * item.qty per selected
        // topping). Made-to-order backflushes recipe ingredients + toppings;
        // stock cuts the finished product + toppings.
        const toppingRows = await client.query<ItemToppingRow>(
          `SELECT id, sales_order_item_id, topping_product_id, topping_name_snapshot,
                  qty_per_item, extra_price_snapshot
           FROM sales_order_item_toppings
           WHERE sales_order_item_id = $1`,
          [itemId],
        );
        for (const t of toppingRows.rows) {
          const requiredQty = Number(t.qty_per_item) * itemQty;
          if (requiredQty > 0) {
            targets.push({ productId: t.topping_product_id, requiredQty });
          }
        }

        // 4-6. FEFO-cut each target across batches; post SALE + snapshot.
        for (const target of targets) {
          await this._consumeFefo(
            client,
            companyId,
            outletId,
            orderId,
            itemId,
            target.productId,
            target.requiredQty,
            bizDate,
            userId,
          );
        }
      }

      // 7. Insert payments.
      for (const payment of payments) {
        await client.query(
          `INSERT INTO sales_payments
             (company_id, outlet_id, sales_order_id, payment_method, amount,
              reference_no, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            companyId,
            outletId,
            orderId,
            payment.method,
            payment.amount,
            payment.referenceNo,
            userId,
          ],
        );
      }

      // 8. Flip to PAID.
      const updated = await client.query<HeaderRow>(
        `UPDATE sales_orders
         SET status = 'PAID', paid_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, orderId, companyId],
      );

      const items = await this._loadItems(client, orderId);
      const paymentRows = await this._loadPayments(client, orderId);

      await client.query('COMMIT');
      return this._toOrder(updated.rows[0], items, paymentRows);
    } catch (err) {
      await client.query('ROLLBACK');
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        // Duplicate SALE source key → double-pay already posted (idempotency).
        throw new ConflictError('INVENTORY.DUPLICATE_MOVEMENT_SOURCE');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * FEFO-consume `requiredQty` of `productId` at the outlet, across batches
   * (nearest expiry first), under row locks. Posts a SALE movement + a
   * sales_consumptions snapshot per batch slice. Rolls up to
   * INVENTORY.INSUFFICIENT_STOCK (via the caller's rollback) when the product
   * cannot cover the required quantity. Identical mechanic to the Production
   * backflush — the only difference is the target product.
   */
  private async _consumeFefo(
    client: PoolClient,
    companyId: string,
    outletId: string,
    orderId: string,
    salesOrderItemId: string,
    productId: string,
    requiredQty: number,
    bizDate: string,
    userId: string | null,
  ): Promise<void> {
    const batchesResult = await client.query<BatchRow>(
      `SELECT id, qty_available
       FROM inventory_batches
       WHERE company_id = $1 AND outlet_id = $2 AND product_id = $3
         AND status = 'ACTIVE' AND qty_available > 0
         AND (expired_date IS NULL OR expired_date >= $4)
       ORDER BY expired_date ASC NULLS LAST, received_date ASC, created_at ASC
       FOR UPDATE`,
      [companyId, outletId, productId, bizDate],
    );

    let remaining = requiredQty;
    for (const batch of batchesResult.rows) {
      if (remaining <= 1e-9) break;
      const available = Number(batch.qty_available);
      const take = Math.min(available, remaining);
      if (take <= 0) continue;
      const beforeQty = available;
      const afterQty = beforeQty - take;

      await client.query(
        `UPDATE inventory_batches
         SET qty_available = $1::numeric,
             status = CASE WHEN $1::numeric = 0 THEN 'CONSUMED' ELSE status END,
             updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [afterQty, batch.id, companyId],
      );

      // Ledger append: SALE (OUTBOUND). Source key = SALES_ORDER + item + batch.
      const movementResult = await client.query<{ id: string }>(
        `INSERT INTO inventory_movements
           (company_id, outlet_id, batch_id, product_id, movement_type,
            qty, before_qty, after_qty,
            source_document_type, source_document_id,
            source_document_item_id, source_document_allocation_id, user_id)
         VALUES ($1,$2,$3,$4,'SALE',$5,$6,$7,'SALES_ORDER',$8,$9,$10,$11)
         RETURNING id`,
        [
          companyId,
          outletId,
          batch.id,
          productId,
          take,
          beforeQty,
          afterQty,
          orderId,
          salesOrderItemId,
          batch.id,
          userId,
        ],
      );
      const movementId = movementResult.rows[0].id;

      // Snapshot the consumed batch (crucial for Fase 3 refund + audit).
      await client.query(
        `INSERT INTO sales_consumptions
           (company_id, outlet_id, sales_order_id, sales_order_item_id,
            product_id, batch_id, qty_consumed, movement_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [companyId, outletId, orderId, salesOrderItemId, productId, batch.id, take, movementId],
      );

      remaining -= take;
    }

    if (remaining > 1e-9) {
      // Negative-stock ban (#11): not enough stock for this product.
      throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
    }
  }

  // ── Void (PENDING_PAYMENT -> CANCELLED; no stock) ─────────────────────────

  async void(orderId: string, companyId: string, userId: string | null): Promise<SalesOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM sales_orders
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         FOR UPDATE`,
        [orderId, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('SALES_ORDER.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (header.status !== 'PENDING_PAYMENT') {
        throw new InvariantError('SALES_ORDER.INVALID_STATUS_TRANSITION');
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE sales_orders
         SET status = 'CANCELLED', updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, orderId, companyId],
      );

      const items = await this._loadItems(client, orderId);
      await client.query('COMMIT');
      return this._toOrder(updated.rows[0], items, []);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Refund (PAID -> REFUNDED, full-order) — atomic ────────────────────────

  private _toReturn(
    header: SalesReturnHeaderRow,
    items: SalesReturnItem[] = [],
  ): SalesReturn {
    return new SalesReturn({
      id: header.id,
      companyId: header.company_id,
      outletId: header.outlet_id,
      salesOrderId: header.sales_order_id,
      reason: header.reason,
      refundAmount: Number(header.refund_amount),
      status: header.status as SalesReturnStatus,
      returnedBy: header.returned_by,
      items,
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  private _toReturnItem(row: SalesReturnItemRow): SalesReturnItem {
    return {
      id: row.id,
      salesOrderItemId: row.sales_order_item_id,
      qtyReturned: Number(row.qty_returned),
      refundLineAmount: Number(row.refund_line_amount),
    };
  }

  async refund(
    orderId: string,
    companyId: string,
    userId: string | null,
    reason: string | null,
  ): Promise<SalesRefundResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // 1. Lock the order; assert PAID (idempotency: reject already REFUNDED).
      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM sales_orders
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         FOR UPDATE`,
        [orderId, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('SALES_ORDER.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      if (header.status === 'REFUNDED') {
        throw new ConflictError('SALES_ORDER.ALREADY_REFUNDED');
      }
      if (header.status !== 'PAID') {
        throw new InvariantError('SALES_ORDER.NOT_PAID');
      }

      const outletId = header.outlet_id;
      const grandTotal = Number(header.grand_total);

      // 2. Insert the sales_returns header (COMPLETED, refund = grand_total).
      const returnResult = await client.query<SalesReturnHeaderRow>(
        `INSERT INTO sales_returns
           (company_id, outlet_id, sales_order_id, reason, refund_amount,
            status, returned_by, created_by)
         VALUES ($1,$2,$3,$4,$5,'COMPLETED',$6,$6)
         RETURNING ${RETURN_HEADER_COLUMNS}`,
        [companyId, outletId, orderId, reason, grandTotal, userId],
      );
      const returnHeader = returnResult.rows[0];
      const salesReturnId = returnHeader.id;

      // 3. One sales_return_item per order item: qty_returned = item qty,
      //    refund_line_amount = item line_total (full-order refund).
      const orderItems = await client.query<ItemRow>(
        `SELECT id, product_id, sale_mode, recipe_id, product_name_snapshot,
                unit_price_snapshot, qty, item_discount, toppings_price, line_total
         FROM sales_order_items
         WHERE sales_order_id = $1
         ORDER BY created_at ASC`,
        [orderId],
      );
      // Map each order item to the sales_return_item that reverses it, so the
      // inbound SALE_RETURN movement can carry a deterministic, unique source
      // key (source_document_item_id = sales_return_item id).
      const returnItemByOrderItemId = new Map<string, string>();
      for (const item of orderItems.rows) {
        const returnItemResult = await client.query<{ id: string }>(
          `INSERT INTO sales_return_items
             (sales_return_id, sales_order_item_id, qty_returned, refund_line_amount)
           VALUES ($1,$2,$3,$4)
           RETURNING id`,
          [salesReturnId, item.id, Number(item.qty), Number(item.line_total)],
        );
        returnItemByOrderItemId.set(item.id, returnItemResult.rows[0].id);
      }

      // 4. Return ALL consumed stock to its ORIGINAL batch. The reversal derives
      //    from posted SALE consumptions (sales_consumptions), not item
      //    snapshots (doc 35 §8).
      const consumptions = await client.query<SalesConsumptionRow>(
        `SELECT id, sales_order_item_id, product_id, batch_id, qty_consumed
         FROM sales_consumptions
         WHERE sales_order_id = $1 AND company_id = $2
         ORDER BY created_at ASC`,
        [orderId, companyId],
      );

      for (const consumption of consumptions.rows) {
        const qty = Number(consumption.qty_consumed);
        const returnItemId =
          returnItemByOrderItemId.get(consumption.sales_order_item_id) ?? null;

        // Reload the source batch FOR UPDATE; add qty back; reactivate if it was
        // CONSUMED (its qty fell to 0 at pay time).
        const batchResult = await client.query<{ qty_available: string }>(
          `SELECT qty_available FROM inventory_batches
           WHERE id = $1 AND company_id = $2 FOR UPDATE`,
          [consumption.batch_id, companyId],
        );
        if (!batchResult.rowCount) {
          throw new NotFoundError('INVENTORY_BATCH.NOT_FOUND');
        }
        const beforeQty = Number(batchResult.rows[0].qty_available);
        const afterQty = beforeQty + qty;

        await client.query(
          `UPDATE inventory_batches
           SET qty_available = $1::numeric,
               status = CASE WHEN status = 'CONSUMED' AND $1::numeric > 0
                             THEN 'ACTIVE' ELSE status END,
               updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [afterQty, consumption.batch_id, companyId],
        );

        // Ledger append: SALE_RETURN (INBOUND). Source key =
        // SALES_RETURN + sales_return_item + batch, unique → double-refund guard.
        await client.query(
          `INSERT INTO inventory_movements
             (company_id, outlet_id, batch_id, product_id, movement_type,
              qty, before_qty, after_qty,
              source_document_type, source_document_id,
              source_document_item_id, source_document_allocation_id, user_id)
           VALUES ($1,$2,$3,$4,'SALE_RETURN',$5,$6,$7,'SALES_RETURN',$8,$9,$10,$11)`,
          [
            companyId,
            outletId,
            consumption.batch_id,
            consumption.product_id,
            qty,
            beforeQty,
            afterQty,
            salesReturnId,
            returnItemId,
            consumption.batch_id,
            userId,
          ],
        );
      }

      // 5. Flip the order to REFUNDED.
      const updated = await client.query<HeaderRow>(
        `UPDATE sales_orders
         SET status = 'REFUNDED', updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING ${HEADER_COLUMNS}`,
        [userId, orderId, companyId],
      );

      const returnItems = await this._loadReturnItems(client, salesReturnId);
      const orderItemVos = await this._loadItems(client, orderId);
      const paymentRows = await this._loadPayments(client, orderId);

      await client.query('COMMIT');
      return {
        order: this._toOrder(updated.rows[0], orderItemVos, paymentRows),
        salesReturn: this._toReturn(returnHeader, returnItems),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        // Duplicate SALE_RETURN source key / return row → refund already posted.
        throw new ConflictError('INVENTORY.DUPLICATE_MOVEMENT_SOURCE');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  private async _loadReturnItems(
    client: PoolClient | Pool,
    salesReturnId: string,
  ): Promise<SalesReturnItem[]> {
    const result = await client.query<SalesReturnItemRow>(
      `SELECT id, sales_order_item_id, qty_returned, refund_line_amount
       FROM sales_return_items
       WHERE sales_return_id = $1
       ORDER BY created_at ASC`,
      [salesReturnId],
    );
    return result.rows.map((r) => this._toReturnItem(r));
  }

  async getReturnByOrderId(
    orderId: string,
    companyId: string,
  ): Promise<SalesReturn | null> {
    const headerResult = await this.pool.query<SalesReturnHeaderRow>(
      `SELECT ${RETURN_HEADER_COLUMNS} FROM sales_returns
       WHERE sales_order_id = $1 AND company_id = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [orderId, companyId],
    );
    if (!headerResult.rowCount) {
      return null;
    }
    const items = await this._loadReturnItems(this.pool, headerResult.rows[0].id);
    return this._toReturn(headerResult.rows[0], items);
  }

  // ── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string, companyId: string): Promise<SalesOrder> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM sales_orders
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('SALES_ORDER.NOT_FOUND');
    }
    const items = await this._loadItems(this.pool, id);
    const payments = await this._loadPayments(this.pool, id);
    return this._toOrder(headerResult.rows[0], items, payments);
  }

  async list(companyId: string, filter: SalesOrderListFilter): Promise<SalesOrderListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.outletId) {
      params.push(filter.outletId);
      conditions.push(`outlet_id = $${params.length}`);
    }
    if (filter.shiftId) {
      params.push(filter.shiftId);
      conditions.push(`shift_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`invoice_number ILIKE $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sales_orders WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM sales_orders
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    // List returns headers only (items/payments loaded on detail).
    return { rows: headerResult.rows.map((h) => this._toOrder(h)), total };
  }

  // ── POS product grid + topping lookup ─────────────────────────────────────

  async listPosProducts(
    companyId: string,
    filter: PosProductFilter,
  ): Promise<PosProductResult> {
    // Sellable products: active, non-deleted. A product is listed when it has an
    // ACTIVE recipe (i.e. it is backflushable) OR is FINISHED_GOODS (sold from
    // its own stock). This is the GRID's sellability rule, independent of the
    // per-line checkout resolution in resolveCheckoutItems.
    const conditions: string[] = ['p.company_id = $1', 'p.deleted_at IS NULL', 'p.is_active = TRUE'];
    const params: unknown[] = [companyId];

    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    // Sellable filter: ACTIVE recipe exists OR product_type = FINISHED_GOODS.
    const sellableClause = `(
      EXISTS (
        SELECT 1 FROM recipes r
        WHERE r.company_id = p.company_id AND r.product_id = p.id
          AND r.status = 'ACTIVE' AND r.deleted_at IS NULL
      )
      OR p.product_type = 'FINISHED_GOODS'
    )`;
    conditions.push(sellableClause);

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products p WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    // Two finished-goods figures per product, both scoped to the requested
    // outlet and both derived from the same source as Stock On Hand (ACTIVE
    // batches with qty_available > 0):
    //   available_qty — not expired yet (NULL expiry counts as sellable)
    //   expired_qty   — already past CURRENT_DATE
    // The qty_available > 0 guard is mandatory on BOTH: an expired batch that
    // has already been fully consumed would otherwise inflate expired_qty with
    // a meaningless figure and hide the real reason a line was rejected.
    // Without an outletId the param is NULL, so both sums collapse to 0.
    const outletParam = `$${params.length + 1}`;
    const rowsResult = await this.pool.query<{
      id: string;
      sku: string;
      name: string;
      product_type: string;
      selling_price: string;
      has_toppings: boolean;
      recipe_id: string | null;
      available_qty: string | null;
      expired_qty: string | null;
    }>(
      `SELECT p.id, p.sku, p.name, p.product_type, p.selling_price, p.has_toppings,
              (SELECT r.id FROM recipes r
               WHERE r.company_id = p.company_id AND r.product_id = p.id
                 AND r.status = 'ACTIVE' AND r.deleted_at IS NULL
               LIMIT 1) AS recipe_id,
              (SELECT COALESCE(SUM(ib.qty_available), 0)
               FROM inventory_batches ib
               WHERE ib.company_id = p.company_id AND ib.product_id = p.id
                 AND ib.outlet_id = ${outletParam}::uuid
                 AND ib.status = 'ACTIVE' AND ib.qty_available > 0
                 AND (ib.expired_date IS NULL OR ib.expired_date >= CURRENT_DATE)
              ) AS available_qty,
              (SELECT COALESCE(SUM(ib.qty_available), 0)
               FROM inventory_batches ib
               WHERE ib.company_id = p.company_id AND ib.product_id = p.id
                 AND ib.outlet_id = ${outletParam}::uuid
                 AND ib.status = 'ACTIVE' AND ib.qty_available > 0
                 AND ib.expired_date IS NOT NULL AND ib.expired_date < CURRENT_DATE
              ) AS expired_qty
       FROM products p
       WHERE ${whereClause}
       ORDER BY p.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      [...params, filter.outletId ?? null],
    );

    // Each product carries a hasToppings flag (model global, doc 51 §2.1); the
    // topping LIST is global and fetched separately via listActiveToppings.
    const rows: PosProduct[] = rowsResult.rows.map((r) => {
      // CAPABILITY, not the checkout mode: this only reports whether the
      // product has an ACTIVE recipe (so the FE knows a modifier panel is
      // worth opening). The sale mode actually used is resolved per line from
      // the outlet's sellable stock in resolveCheckoutItems.
      const saleMode: SaleMode = r.recipe_id !== null ? 'MADE_TO_ORDER' : 'STOCK';
      return {
        productId: r.id,
        sku: r.sku,
        name: r.name,
        productType: r.product_type,
        sellingPrice: Number(r.selling_price),
        saleMode,
        recipeId: r.recipe_id,
        hasToppings: r.has_toppings,
        availableQty: Number(r.available_qty ?? 0),
        expiredQty: Number(r.expired_qty ?? 0),
      };
    });

    return { rows, total };
  }

  async listActiveToppings(
    companyId: string,
    outletId?: string | null,
  ): Promise<PosToppingOption[]> {
    // Active entries of the GLOBAL topping catalog (shared by all products).
    // Two per-outlet stock figures per topping product, both scoped to the
    // requested outlet and both derived from the same source as Stock On Hand
    // (ACTIVE batches with qty_available > 0) — the IDENTICAL pattern used by
    // listPosProducts/resolveCheckoutItems:
    //   available_qty — not expired yet (NULL expiry counts as sellable)
    //   expired_qty   — already past CURRENT_DATE
    // The qty_available > 0 guard is mandatory on BOTH: an expired batch that
    // has been fully consumed would otherwise inflate expired_qty with a
    // meaningless figure. Without an outletId the param is NULL, so both sums
    // collapse to 0 (safe degradation; checkout/pay() stay the final guard).
    const result = await this.pool.query<{
      topping_product_id: string;
      topping_name: string;
      default_qty_per_item: string;
      extra_price: string;
      sort_order: number;
      available_qty: string | null;
      expired_qty: string | null;
    }>(
      `SELECT tg.topping_product_id, tp.name AS topping_name,
              tg.default_qty_per_item, tg.extra_price, tg.sort_order,
              (SELECT COALESCE(SUM(ib.qty_available), 0)
               FROM inventory_batches ib
               WHERE ib.company_id = tg.company_id AND ib.product_id = tg.topping_product_id
                 AND ib.outlet_id = $2::uuid
                 AND ib.status = 'ACTIVE' AND ib.qty_available > 0
                 AND (ib.expired_date IS NULL OR ib.expired_date >= CURRENT_DATE)
              ) AS available_qty,
              (SELECT COALESCE(SUM(ib.qty_available), 0)
               FROM inventory_batches ib
               WHERE ib.company_id = tg.company_id AND ib.product_id = tg.topping_product_id
                 AND ib.outlet_id = $2::uuid
                 AND ib.status = 'ACTIVE' AND ib.qty_available > 0
                 AND ib.expired_date IS NOT NULL AND ib.expired_date < CURRENT_DATE
              ) AS expired_qty
       FROM toppings tg
       JOIN products tp ON tp.id = tg.topping_product_id
       WHERE tg.company_id = $1 AND tg.is_active = TRUE AND tg.deleted_at IS NULL
       ORDER BY tg.sort_order ASC, tp.name ASC`,
      [companyId, outletId ?? null],
    );

    return result.rows.map((row) => ({
      toppingProductId: row.topping_product_id,
      toppingName: row.topping_name,
      defaultQtyPerItem: Number(row.default_qty_per_item),
      extraPrice: Number(row.extra_price),
      sortOrder: Number(row.sort_order),
      availableQty: Number(row.available_qty ?? 0),
      expiredQty: Number(row.expired_qty ?? 0),
    }));
  }
}
