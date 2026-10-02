import { Pool, PoolClient } from 'pg';
import { ProductionOrderRepositoryPostgres } from '../ProductionOrderRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 'po1',
    company_id: 'c1',
    outlet_id: 'outlet-1',
    production_number: 'PRD-2026-000001',
    recipe_id: 'recipe-1',
    product_id: 'finished-1',
    scale_factor: '2',
    scheduled_qty: '40',
    actual_qty: '38',
    waste_qty: '2',
    production_date: new Date('2026-09-28'),
    result_expired_date: new Date('2026-10-05'),
    status: 'COMPLETED',
    notes: null,
    result_batch_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

const baseData = {
  outletId: 'outlet-1',
  recipeId: 'recipe-1',
  productId: null,
  scheduledQty: 40,
  actualQty: 38,
  wasteQty: 2,
  resultExpiredDate: '2026-10-05',
  productionDate: null,
  notes: null,
  createdBy: 'u1',
};

describe('ProductionOrderRepositoryPostgres (instant-complete)', () => {
  let repo: ProductionOrderRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ProductionOrderRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('createInstant', () => {
    it('should resolve recipe, backflush FEFO, create finished batch and COMPLETE', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({
          rows: [{ id: 'recipe-1', product_id: 'finished-1', yield_qty: '20', status: 'ACTIVE' }],
          rowCount: 1,
        }) // resolve recipe by id
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate number
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // insert header COMPLETED
        .mockResolvedValueOnce({
          rows: [{ id: 'ri-1', ingredient_product_id: 'ing-1', qty: '500', loss_percentage: '0' }],
          rowCount: 1,
        }) // recipe items (need 500 * scale 2 = 1000)
        .mockResolvedValueOnce({
          rows: [
            { id: 'batch-1', batch_number: 'B1', lot_key: '', expired_date: new Date('2026-10-01'), qty_available: '1000' },
          ],
          rowCount: 1,
        }) // FEFO batches
        .mockResolvedValueOnce(undefined) // UPDATE batch balance
        .mockResolvedValueOnce(undefined) // INSERT PRODUCTION_CONSUME movement
        .mockResolvedValueOnce(undefined) // INSERT production_order_materials
        .mockResolvedValueOnce({ rows: [{ id: 'fg-batch' }], rowCount: 1 }) // INSERT finished batch
        .mockResolvedValueOnce(undefined) // INSERT PRODUCTION_RESULT movement
        .mockResolvedValueOnce(undefined) // INSERT production_order_results
        .mockResolvedValueOnce(undefined) // UPDATE header result_batch_id
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load results
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.createInstant('c1', baseData);

      expect(result.status).toBe('COMPLETED');
      expect(result.productionNumber).toBe('PRD-2026-000001');
      expect(result.scaleFactor).toBe(2);
      expect(result.resultBatchId).toBe('fg-batch');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should NOT create a finished batch when actualQty is 0 (full waste)', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({
          rows: [{ id: 'recipe-1', product_id: 'finished-1', yield_qty: '20', status: 'ACTIVE' }],
          rowCount: 1,
        }) // resolve recipe
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate number
        .mockResolvedValueOnce({
          rows: [header({ actual_qty: '0', waste_qty: '40', result_expired_date: null })],
          rowCount: 1,
        }) // insert header COMPLETED
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // recipe items (none for brevity)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load results
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.createInstant('c1', {
        ...baseData,
        actualQty: 0,
        wasteQty: 40,
        resultExpiredDate: null,
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.resultBatchId).toBeNull();
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should reject when the resolved recipe is not ACTIVE', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({
          rows: [{ id: 'recipe-1', product_id: 'finished-1', yield_qty: '20', status: 'DRAFT' }],
          rowCount: 1,
        }) // resolve recipe
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.createInstant('c1', baseData)).rejects.toBeInstanceOf(InvariantError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw NO_ACTIVE_RECIPE when resolving by product finds none', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // resolve active by product
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.createInstant('c1', { ...baseData, recipeId: null, productId: 'finished-1' }),
      ).rejects.toThrow('RECIPE.NO_ACTIVE_RECIPE');
    });

    it('should throw INSUFFICIENT_STOCK when FEFO cannot cover the requirement', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({
          rows: [{ id: 'recipe-1', product_id: 'finished-1', yield_qty: '20', status: 'ACTIVE' }],
          rowCount: 1,
        }) // resolve recipe
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate number
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // insert header
        .mockResolvedValueOnce({
          rows: [{ id: 'ri-1', ingredient_product_id: 'ing-1', qty: '500', loss_percentage: '0' }],
          rowCount: 1,
        }) // recipe items (need 1000)
        .mockResolvedValueOnce({
          rows: [
            { id: 'batch-1', batch_number: 'B1', lot_key: '', expired_date: new Date('2026-10-01'), qty_available: '100' },
          ],
          rowCount: 1,
        }) // FEFO: only 100 available
        .mockResolvedValueOnce(undefined) // UPDATE batch balance
        .mockResolvedValueOnce(undefined) // INSERT movement
        .mockResolvedValueOnce(undefined) // INSERT material snapshot
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.createInstant('c1', baseData)).rejects.toThrow(
        'INVENTORY.INSUFFICIENT_STOCK',
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getById', () => {
    it('should throw NotFoundError when missing', async () => {
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should load header + materials + results', async () => {
      client.query
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // results

      const result = await repo.getById('po1', 'c1');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('list', () => {
    it('should return headers only with total', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }); // rows

      const result = await repo.list('c1', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].status).toBe('COMPLETED');
    });
  });
});
