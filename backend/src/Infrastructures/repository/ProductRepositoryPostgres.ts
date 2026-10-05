import { Pool } from 'pg';
import {
  ProductRepository,
  ProductListFilter,
  ProductListResult,
  NewProductData,
} from '../../Domains/products/ProductRepository';
import { Product } from '../../Domains/products/entities/Product';
import { UpdateProductFields } from '../../Domains/products/entities/UpdateProduct';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface ProductRow {
  id: string;
  company_id: string;
  sku: string;
  barcode: string | null;
  name: string;
  product_group_id: string;
  category_id: string;
  uom_id: string;
  supplier_id: string;
  product_type: string;
  purchase_price: string;
  selling_price: string;
  minimum_stock: string;
  shelf_life_days: number;
  is_batch_tracked: boolean;
  has_toppings: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `id, company_id, sku, barcode, name, product_group_id, category_id, uom_id, supplier_id, product_type, purchase_price, selling_price, minimum_stock, shelf_life_days, is_batch_tracked, has_toppings, is_active, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of ProductRepository.
 * Raw SQL via pg Pool — no ORM. Scoped by company_id, excludes soft-deleted rows.
 */
export class ProductRepositoryPostgres extends ProductRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toProduct(row: ProductRow): Product {
    return new Product({
      id: row.id,
      companyId: row.company_id,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      productGroupId: row.product_group_id,
      categoryId: row.category_id,
      uomId: row.uom_id,
      supplierId: row.supplier_id,
      productType: row.product_type,
      purchasePrice: row.purchase_price,
      sellingPrice: row.selling_price,
      minimumStock: row.minimum_stock,
      shelfLifeDays: row.shelf_life_days,
      isBatchTracked: row.is_batch_tracked,
      hasToppings: row.has_toppings,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async addProduct(data: NewProductData, companyId: string): Promise<Product> {
    const result = await this.pool.query<ProductRow>(
      `INSERT INTO products (
         company_id, sku, barcode, name, product_group_id, category_id, uom_id, supplier_id,
         product_type, purchase_price, selling_price, minimum_stock, shelf_life_days, is_batch_tracked,
         has_toppings
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING ${SELECT_COLUMNS}`,
      [
        companyId,
        data.sku,
        data.barcode,
        data.name,
        data.productGroupId,
        data.categoryId,
        data.uomId,
        data.supplierId,
        data.productType,
        data.purchasePrice,
        data.sellingPrice,
        data.minimumStock,
        data.shelfLifeDays,
        data.isBatchTracked,
        data.hasToppings,
      ],
    );

    return this._toProduct(result.rows[0]);
  }

  async getProductsByCompany(
    companyId: string,
    filter: ProductListFilter,
  ): Promise<ProductListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(
        `(name ILIKE $${params.length} OR sku ILIKE $${params.length} OR barcode ILIKE $${params.length})`,
      );
    }
    if (filter.isActive !== undefined) {
      params.push(filter.isActive);
      conditions.push(`is_active = $${params.length}`);
    }
    if (filter.productType) {
      params.push(filter.productType);
      conditions.push(`product_type = $${params.length}`);
    }
    if (filter.productGroupId) {
      params.push(filter.productGroupId);
      conditions.push(`product_group_id = $${params.length}`);
    }
    if (filter.categoryId) {
      params.push(filter.categoryId);
      conditions.push(`category_id = $${params.length}`);
    }
    if (filter.supplierId) {
      params.push(filter.supplierId);
      conditions.push(`supplier_id = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<ProductRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM products
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((row) => this._toProduct(row)), total };
  }

  async getProductById(id: string, companyId: string): Promise<Product> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM products
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT.NOT_FOUND');
    }

    return this._toProduct(result.rows[0]);
  }

  async updateProduct(
    id: string,
    companyId: string,
    fields: UpdateProductFields,
  ): Promise<Product> {
    const existing = await this.getProductById(id, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    const columnMap: Record<keyof UpdateProductFields, string> = {
      name: 'name',
      barcode: 'barcode',
      productType: 'product_type',
      purchasePrice: 'purchase_price',
      sellingPrice: 'selling_price',
      minimumStock: 'minimum_stock',
      shelfLifeDays: 'shelf_life_days',
      isBatchTracked: 'is_batch_tracked',
      hasToppings: 'has_toppings',
      isActive: 'is_active',
    };

    for (const key of Object.keys(columnMap) as (keyof UpdateProductFields)[]) {
      if (fields[key] !== undefined) {
        params.push(fields[key] as unknown);
        setClauses.push(`${columnMap[key]} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      return existing;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id, companyId);

    const result = await this.pool.query<ProductRow>(
      `UPDATE products
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toProduct(result.rows[0]);
  }

  async softDeleteProduct(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE products
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PRODUCT.NOT_FOUND');
    }
  }

  async verifyAvailableSku(sku: string, companyId: string, excludeId?: string): Promise<void> {
    const params: unknown[] = [sku, companyId];
    let excludeClause = '';
    if (excludeId) {
      params.push(excludeId);
      excludeClause = ` AND id <> $${params.length}`;
    }

    const result = await this.pool.query(
      `SELECT id FROM products
       WHERE sku = $1 AND company_id = $2 AND deleted_at IS NULL${excludeClause}`,
      params,
    );

    if (result.rowCount && result.rowCount > 0) {
      throw new ConflictError('PRODUCT.SKU_ALREADY_USED');
    }
  }

  async verifyAvailableBarcode(
    barcode: string,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const params: unknown[] = [barcode, companyId];
    let excludeClause = '';
    if (excludeId) {
      params.push(excludeId);
      excludeClause = ` AND id <> $${params.length}`;
    }

    const result = await this.pool.query(
      `SELECT id FROM products
       WHERE barcode = $1 AND company_id = $2 AND deleted_at IS NULL${excludeClause}`,
      params,
    );

    if (result.rowCount && result.rowCount > 0) {
      throw new ConflictError('PRODUCT.BARCODE_ALREADY_USED');
    }
  }
}
