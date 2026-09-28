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
    actual_qty: null,
    waste_qty: '0',
    production_date: new Date('2026-09-28'),
    result_expired_date: null,
    status: 'SCHEDULED',
    qa_notes: null,
    notes: null,
    result_batch_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

describe('ProductionOrderRepositoryPostgres', () => {
  let repo: ProductionOrderRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ProductionOrderRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('schedule', () => {
    it('should resolve recipe by id, compute scale_factor and insert SCHEDULED', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'recipe-1', product_id: 'finished-1', yield_qty: '20', status: 'ACTIVE' }],
          rowCount: 1,
        }) // resolve recipe
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate number
        .mockResolvedValueOnce({ rows: [header({ scale_factor: '2' })], rowCount: 1 }) // insert
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.schedule('c1', {
        outletId: 'outlet-1',
        recipeId: 'recipe-1',
        productId: null,
        scheduledQty: 40,
        productionDate: null,
        notes: null,
        createdBy: 'u1',
      });

      expect(result.productionNumber).toBe('PRD-2026-000001');
      expect(result.scaleFactor).toBe(2);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should reject when the resolved recipe is not ACTIVE', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'recipe-1', product_id: 'finished-1', yield_qty: '20', status: 'DRAFT' }],
          rowCount: 1,
        }) // resolve recipe
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.schedule('c1', {
          outletId: 'outlet-1',
          recipeId: 'recipe-1',
          productId: null,
          scheduledQty: 40,
          productionDate: null,
          notes: null,
          createdBy: 'u1',
        }),
      ).rejects.toBeInstanceOf(InvariantError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw NO_ACTIVE_RECIPE when resolving by product finds none', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // resolve active by product
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        repo.schedule('c1', {
          outletId: 'outlet-1',
          recipeId: null,
          productId: 'finished-1',
          scheduledQty: 40,
          productionDate: null,
          notes: null,
          createdBy: 'u1',
        }),
      ).rejects.toThrow('RECIPE.NO_ACTIVE_RECIPE');
    });
  });

  describe('getById', () => {
    it('should throw NotFoundError when missing', async () => {
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should load header + materials + results', async () => {
      client.query
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED' })], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // results

      const result = await repo.getById('po1', 'c1');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('start', () => {
    it('should transition SCHEDULED -> IN_PROGRESS', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'SCHEDULED' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_PROGRESS' })], rowCount: 1 }) // update
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.start('po1', 'c1', 'u1');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should reject an invalid transition', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'COMPLETED' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.start('po1', 'c1', 'u1')).rejects.toBeInstanceOf(InvariantError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('complete (backflushing)', () => {
    it('should consume ingredients FEFO and create a finished batch on QA pass', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({
          rows: [
            header({
              status: 'QA_PASSED',
              actual_qty: '38',
              result_expired_date: new Date('2026-10-05'),
            }),
          ],
          rowCount: 1,
        }) // lock header
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
        .mockResolvedValueOnce({
          rows: [header({ status: 'COMPLETED', result_batch_id: 'fg-batch', actual_qty: '38' })],
          rowCount: 1,
        }) // UPDATE header COMPLETED
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load results
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.complete('po1', 'c1', 'u1');
      expect(result.status).toBe('COMPLETED');
      expect(result.resultBatchId).toBe('fg-batch');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw INSUFFICIENT_STOCK when FEFO cannot cover the requirement', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({
          rows: [header({ status: 'QA_PASSED', actual_qty: '38', result_expired_date: new Date('2026-10-05') })],
          rowCount: 1,
        }) // lock header
        .mockResolvedValueOnce({
          rows: [{ id: 'ri-1', ingredient_product_id: 'ing-1', qty: '500', loss_percentage: '0' }],
          rowCount: 1,
        }) // recipe items (need 1000)
        .mockResolvedValueOnce({
          rows: [
            { id: 'batch-1', batch_number: 'B1', lot_key: '', expired_date: new Date('2026-10-01'), qty_available: '100' },
          ],
          rowCount: 1,
        }) // FEFO batches: only 100 available
        .mockResolvedValueOnce(undefined) // UPDATE batch balance
        .mockResolvedValueOnce(undefined) // INSERT movement
        .mockResolvedValueOnce(undefined) // INSERT material snapshot
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('po1', 'c1', 'u1')).rejects.toThrow('INVENTORY.INSUFFICIENT_STOCK');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should NOT create a finished batch on QA fail (scrap output)', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({
          rows: [header({ status: 'QA_FAILED', actual_qty: '38', result_expired_date: new Date('2026-10-05') })],
          rowCount: 1,
        }) // lock header
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // recipe items: none for simplicity
        .mockResolvedValueOnce({
          rows: [header({ status: 'COMPLETED', result_batch_id: null })],
          rowCount: 1,
        }) // UPDATE header COMPLETED
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // load results
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.complete('po1', 'c1', 'u1');
      expect(result.status).toBe('COMPLETED');
      expect(result.resultBatchId).toBeNull();
    });

    it('should reject completing from a non-QA state', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SET SERIALIZABLE
        .mockResolvedValueOnce({ rows: [header({ status: 'IN_PROGRESS' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.complete('po1', 'c1', 'u1')).rejects.toBeInstanceOf(InvariantError);
    });
  });
});
