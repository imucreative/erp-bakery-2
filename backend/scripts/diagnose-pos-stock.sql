-- Diagnose POS stock visibility for a finished product.
--
-- Usage (psql):  psql -d <db> -v sku='SKU-WAFFLE-1' -f diagnose-pos-stock.sql
-- Usage (pgAdmin / DBeaver): replace :'sku' with the literal, e.g. 'SKU-WAFFLE-1'.
--
-- What "healthy" looks like for a sellable STOCK item:
--   products.product_type = 'FINISHED_GOODS', is_active = true
--   at least one inventory_batches row with status = 'ACTIVE',
--     qty_available > 0, expired_date IS NULL or >= today,
--     at the SAME outlet_id the POS terminal sends.
--   (GET /sales/pos/products sums exactly those rows per outlet.)

\pset footer off

\echo '=== 1. Product master ==='
SELECT id, name, sku, product_type, is_active, has_toppings
FROM products
WHERE sku = :'sku';

\echo '=== 2. Batches for this SKU (newest first) ==='
SELECT ib.batch_number,
       ib.qty_available,
       ib.status,
       ib.expired_date,
       ib.received_date,
       o.name AS outlet,
       ib.created_at
FROM inventory_batches ib
JOIN products p ON p.id = ib.product_id
LEFT JOIN outlets o ON o.id = ib.outlet_id
WHERE p.sku = :'sku'
ORDER BY ib.created_at DESC
LIMIT 10;

\echo '=== 3. Stock on hand per outlet (what POS sums) ==='
SELECT o.name AS outlet,
       COALESCE(SUM(
         CASE WHEN ib.status = 'ACTIVE'
                   AND ib.qty_available > 0
                   AND (ib.expired_date IS NULL OR ib.expired_date >= CURRENT_DATE)
              THEN ib.qty_available ELSE 0 END
       ), 0) AS sellable_qty,
       COALESCE(SUM(ib.qty_available), 0) AS total_qty
FROM products p
LEFT JOIN inventory_batches ib ON ib.product_id = p.id
LEFT JOIN outlets o ON o.id = ib.outlet_id
WHERE p.sku = :'sku'
GROUP BY o.name
ORDER BY o.name;

\echo '=== 4. Recipes for this product (mode resolution input) ==='
SELECT recipe_number, status, yield_qty
FROM recipes r
JOIN products p ON p.id = r.product_id
WHERE p.sku = :'sku' AND r.deleted_at IS NULL
ORDER BY r.created_at DESC;

\echo '=== 5. Latest production orders for this product ==='
SELECT production_number, status, scheduled_qty, actual_qty,
       result_batch_id IS NOT NULL AS has_result_batch,
       created_at
FROM production_orders po
JOIN products p ON p.id = po.product_id
WHERE p.sku = :'sku'
ORDER BY po.created_at DESC
LIMIT 5;
