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
    items: CheckoutItemRequest[],
  ): Promise<ResolveCheckoutResult> {
    const resolved: ResolvedSalesOrderItem[] = [];

    for (const req of items) {
      // Load the sellable product (must belong to the company, not deleted).
      const productResult = await this.pool.query<{
        id: string;
        name: string;
        product_type: string;
        selling_price: string;
      }>(
        `SELECT id, name, product_type, selling_price
         FROM products
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [req.productId, companyId],
      );
      if (!productResult.rowCount) {
        throw new NotFoundError('PRODUCT.NOT_FOUND');
      }
      const product = productResult.rows[0];

      // Resolve the mode deterministically: ACTIVE recipe wins (MADE_TO_ORDER).
      const recipeResult = await this.pool.query<{ id: string }>(
        `SELECT id FROM recipes
         WHERE company_id = $1 AND product_id = $2 AND status = 'ACTIVE' AND deleted_at IS NULL`,
        [companyId, req.productId],
      );

      let saleMode: SaleMode;
      let recipeId: string | null = null;
      if (recipeResult.rowCount) {
        saleMode = 'MADE_TO_ORDER';
        recipeId = recipeResult.rows[0].id;
      } else if (product.product_type === 'FINISHED_GOODS') {
        saleMode = 'STOCK';
      } else {
        // No ACTIVE recipe and not a stockable finished good → ineligible.
        throw new NotFoundError('RECIPE.NO_ACTIVE_RECIPE');
      }

      // Validate + snapshot toppings per mode.
      const resolvedToppings: ResolvedSalesOrderItemTopping[] = [];
      let toppingsPrice = 0;

      if (req.toppings.length > 0 && saleMode !== 'MADE_TO_ORDER') {
        // STOCK products are sold as-is — toppings are not allowed (§3.4).
        throw new InvariantError('TOPPING.NOT_ALLOWED');
      }

      for (const t of req.toppings) {
        const joinResult = await this.pool.query<{
          topping_product_id: string;
          topping_name: string;
          default_qty_per_item: string;
          extra_price: string;
        }>(
          `SELECT pt.topping_product_id,
                  tp.name AS topping_name,
                  pt.default_qty_per_item,
                  pt.extra_price
           FROM product_toppings pt
           JOIN products tp ON tp.id = pt.topping_product_id
           WHERE pt.company_id = $1 AND pt.product_id = $2
             AND pt.topping_product_id = $3 AND pt.is_active = TRUE`,
          [companyId, req.productId, t.toppingProductId],
        );
        if (!joinResult.rowCount) {
          // Topping not registered/active for this product (§7.1).
          throw new InvariantError('TOPPING.NOT_ALLOWED');
        }
        const join = joinResult.rows[0];
        const extraPrice = Number(join.extra_price);
        toppingsPrice += extraPrice;
        resolvedToppings.push({
          toppingProductId: join.topping_product_id,
          toppingNameSnapshot: join.topping_name,
          qtyPerItem: Number(join.default_qty_per_item),
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

          // Topping consumption: qty_per_item * item.qty, per selected topping.
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
        } else {
          // STOCK: cut the sellable product's own finished-goods stock.
          targets.push({ productId: item.product_id, requiredQty: itemQty });
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
    // Sellable products: active, non-deleted. A product is sellable when it has
    // an ACTIVE recipe (MADE_TO_ORDER) OR is FINISHED_GOODS (STOCK).
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
    const rowsResult = await this.pool.query<{
      id: string;
      sku: string;
      name: string;
      product_type: string;
      selling_price: string;
      recipe_id: string | null;
    }>(
      `SELECT p.id, p.sku, p.name, p.product_type, p.selling_price,
              (SELECT r.id FROM recipes r
               WHERE r.company_id = p.company_id AND r.product_id = p.id
                 AND r.status = 'ACTIVE' AND r.deleted_at IS NULL
               LIMIT 1) AS recipe_id
       FROM products p
       WHERE ${whereClause}
       ORDER BY p.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    if (rowsResult.rows.length === 0) {
      return { rows: [], total };
    }

    // Resolve mode + fetch toppings for the MADE_TO_ORDER products in one query.
    const madeToOrderIds = rowsResult.rows
      .filter((r) => r.recipe_id !== null)
      .map((r) => r.id);

    const toppingsByProduct = new Map<string, PosToppingOption[]>();
    if (madeToOrderIds.length > 0) {
      const toppingResult = await this.pool.query<{
        product_id: string;
        topping_product_id: string;
        topping_name: string;
        default_qty_per_item: string;
        extra_price: string;
        sort_order: number;
      }>(
        `SELECT pt.product_id, pt.topping_product_id, tp.name AS topping_name,
                pt.default_qty_per_item, pt.extra_price, pt.sort_order
         FROM product_toppings pt
         JOIN products tp ON tp.id = pt.topping_product_id
         WHERE pt.company_id = $1 AND pt.is_active = TRUE
           AND pt.product_id = ANY($2::uuid[])
         ORDER BY pt.sort_order ASC, tp.name ASC`,
        [companyId, madeToOrderIds],
      );
      for (const row of toppingResult.rows) {
        const list = toppingsByProduct.get(row.product_id) ?? [];
        list.push({
          toppingProductId: row.topping_product_id,
          toppingName: row.topping_name,
          defaultQtyPerItem: Number(row.default_qty_per_item),
          extraPrice: Number(row.extra_price),
          sortOrder: Number(row.sort_order),
        });
        toppingsByProduct.set(row.product_id, list);
      }
    }

    const rows: PosProduct[] = rowsResult.rows.map((r) => {
      const saleMode: SaleMode = r.recipe_id !== null ? 'MADE_TO_ORDER' : 'STOCK';
      return {
        productId: r.id,
        sku: r.sku,
        name: r.name,
        productType: r.product_type,
        sellingPrice: Number(r.selling_price),
        saleMode,
        recipeId: r.recipe_id,
        toppings: saleMode === 'MADE_TO_ORDER' ? toppingsByProduct.get(r.id) ?? [] : [],
      };
    });

    return { rows, total };
  }

  async listProductToppings(
    productId: string,
    companyId: string,
  ): Promise<PosToppingOption[]> {
    // Ensure the product exists in the company (throws if not).
    const productResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM products
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [productId, companyId],
    );
    if (!productResult.rowCount) {
      throw new NotFoundError('PRODUCT.NOT_FOUND');
    }

    const result = await this.pool.query<{
      topping_product_id: string;
      topping_name: string;
      default_qty_per_item: string;
      extra_price: string;
      sort_order: number;
    }>(
      `SELECT pt.topping_product_id, tp.name AS topping_name,
              pt.default_qty_per_item, pt.extra_price, pt.sort_order
       FROM product_toppings pt
       JOIN products tp ON tp.id = pt.topping_product_id
       WHERE pt.company_id = $1 AND pt.product_id = $2 AND pt.is_active = TRUE
       ORDER BY pt.sort_order ASC, tp.name ASC`,
      [companyId, productId],
    );

    return result.rows.map((row) => ({
      toppingProductId: row.topping_product_id,
      toppingName: row.topping_name,
      defaultQtyPerItem: Number(row.default_qty_per_item),
      extraPrice: Number(row.extra_price),
      sortOrder: Number(row.sort_order),
    }));
  }
}
