import { Pool, PoolClient } from 'pg';
import { RecipeRepositoryPostgres } from '../RecipeRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../../Commons/exceptions/ConflictError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    company_id: 'c1',
    recipe_number: 'RCP-2026-000001',
    name: 'Roti Tawar',
    product_id: 'finished-1',
    version: 1,
    yield_qty: '20',
    yield_uom_id: 'uom-pcs',
    instructions: null,
    status: 'DRAFT',
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    ingredient_product_id: 'ing-1',
    qty: '500',
    uom_id: 'uom-g',
    loss_percentage: '5',
    ...over,
  };
}

const draftData = {
  name: 'Roti Tawar',
  productId: 'finished-1',
  yieldQty: 20,
  yieldUomId: 'uom-pcs',
  instructions: null,
  items: [{ ingredientProductId: 'ing-1', qty: 500, uomId: 'uom-g', lossPercentage: 5 }],
};

describe('RecipeRepositoryPostgres', () => {
  let repo: RecipeRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new RecipeRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('createDraft', () => {
    it('should generate number, insert header + items, and commit', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate number
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // insert header
        .mockResolvedValueOnce({ rowCount: 1 }) // insert item
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // load items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.createDraft('c1', draftData);
      expect(result.recipeNumber).toBe('RCP-2026-000001');
      expect(result.items).toHaveLength(1);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('activate', () => {
    it('should activate a DRAFT recipe when no active clash', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no active clash
        .mockResolvedValueOnce({ rows: [header({ status: 'ACTIVE' })], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // load items
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.activate('r1', 'c1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw ConflictError when an active recipe already exists', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [{ id: 'other' }], rowCount: 1 }) // active clash
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.activate('r1', 'c1')).rejects.toBeInstanceOf(ConflictError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject activate when not DRAFT', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'ARCHIVED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.activate('r1', 'c1')).rejects.toBeInstanceOf(InvariantError);
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a DRAFT recipe and commit', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE deleted_at
        .mockResolvedValueOnce(undefined); // COMMIT

      await repo.softDelete('r1', 'c1');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      // The UPDATE must set deleted_at
      const updateCall = client.query.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('deleted_at = NOW()'),
      );
      expect(updateCall).toBeDefined();
    });

    it('should throw NotFoundError when recipe is missing', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // lock header -> none
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.softDelete('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject deleting an ACTIVE recipe', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'ACTIVE' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.softDelete('r1', 'c1')).rejects.toBeInstanceOf(InvariantError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject deleting an ARCHIVED recipe', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'ARCHIVED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(repo.softDelete('r1', 'c1')).rejects.toBeInstanceOf(InvariantError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getActiveByProduct', () => {
    it('should throw NO_ACTIVE_RECIPE when none exists', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getActiveByProduct('p1', 'c1')).rejects.toThrow('RECIPE.NO_ACTIVE_RECIPE');
    });

    it('should return the active recipe with items', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [header({ status: 'ACTIVE' })], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }); // items

      const result = await repo.getActiveByProduct('finished-1', 'c1');
      expect(result.status).toBe('ACTIVE');
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('should throw NotFoundError when missing', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('x', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
