import { Pool, PoolClient } from 'pg';
import { PurchaseRequestRepositoryPostgres } from '../PurchaseRequestRepositoryPostgres';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

const mockPool = { query: jest.fn(), connect: jest.fn() } as unknown as Pool;

function header(over: Record<string, unknown> = {}) {
  return {
    id: 'pr1',
    company_id: 'c1',
    pr_number: 'PR-OUT001-2026-000001',
    requestor_id: 'u1',
    destination_outlet_id: 'outlet-1',
    expected_date: new Date('2026-10-05'),
    total_estimated_amount: '16000',
    status: 'DRAFT',
    notes: null,
    approved_by: null,
    approved_at: null,
    created_by: 'u1',
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    product_id: 'prod-1',
    quantity: '3',
    uom_id: 'uom-1',
    estimated_price: '5000',
    subtotal: '15000',
    ...over,
  };
}

function logRow(over: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    from_status: null,
    to_status: 'DRAFT',
    actor_id: 'u1',
    actor_name: 'Budi Owner',
    note: null,
    created_at: new Date(),
    ...over,
  };
}

function commentRow(over: Record<string, unknown> = {}) {
  return {
    id: 'cmt-1',
    category: 'INTERNAL',
    body: 'Please review the quantities.',
    author_id: 'u1',
    author_name: 'Budi Owner',
    created_at: new Date(),
    ...over,
  };
}

const newData = {
  destinationOutletId: 'outlet-1',
  expectedDate: '2026-10-05',
  notes: null,
  totalEstimatedAmount: 16000,
  items: [
    { productId: 'prod-1', quantity: 3, uomId: 'uom-1', estimatedPrice: 5000, subtotal: 15000 },
    { productId: 'prod-2', quantity: 1, uomId: 'uom-1', estimatedPrice: 1000, subtotal: 1000 },
  ],
};

describe('PurchaseRequestRepositoryPostgres', () => {
  let repo: PurchaseRequestRepositoryPostgres;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PurchaseRequestRepositoryPostgres(mockPool);
    client = { query: jest.fn(), release: jest.fn() };
    (mockPool.connect as jest.Mock).mockResolvedValue(client as unknown as PoolClient);
  });

  describe('createDraft', () => {
    it('should generate a PR-{outletCode}-YYYY-NNNNNN number, insert items and a DRAFT log', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ code: 'OUT001' }], rowCount: 1 }) // resolve outlet code
        .mockResolvedValueOnce({ rows: [{ max_serial: null }], rowCount: 1 }) // number lookup
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // insert header
        .mockResolvedValueOnce({ rowCount: 1 }) // insert item 1
        .mockResolvedValueOnce({ rowCount: 1 }) // insert item 2
        .mockResolvedValueOnce({ rowCount: 1 }) // insert log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [logRow()], rowCount: 1 }) // load logs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.createDraft('c1', 'u1', newData);

      expect(result.status).toBe('DRAFT');
      expect(result.prNumber).toBe('PR-OUT001-2026-000001');
      // header insert receives the generated number as 2nd param
      const insertHeaderCall = client.query.mock.calls[3];
      expect(insertHeaderCall[1][1]).toMatch(/^PR-OUT001-\d{4}-000001$/);
      // a null -> DRAFT log row is written
      const insertLogCall = client.query.mock.calls[6];
      expect(insertLogCall[0]).toContain('purchase_request_status_logs');
      expect(insertLogCall[1]).toEqual(['pr1', null, 'DRAFT', 'u1', null]);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should compute the next serial from the max existing serial', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ code: 'OUT001' }], rowCount: 1 }) // outlet code
        .mockResolvedValueOnce({ rows: [{ max_serial: '5' }], rowCount: 1 }) // number lookup
        .mockResolvedValueOnce({ rows: [header({ pr_number: 'PR-OUT001-2026-000006' })], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [logRow()], rowCount: 1 })
        .mockResolvedValueOnce(undefined);

      await repo.createDraft('c1', 'u1', newData);
      const insertHeaderCall = client.query.mock.calls[3];
      expect(insertHeaderCall[1][1]).toBe('PR-OUT001-2026-000006');
    });

    it('should rollback and throw NotFoundError when the outlet is not in the company', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // outlet code lookup -> none

      await expect(repo.createDraft('c1', 'u1', newData)).rejects.toBeInstanceOf(NotFoundError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('updateDraft', () => {
    it('should reject when the PR is not in an editable status', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }); // lock header

      await expect(repo.updateDraft('pr1', 'c1', 'u1', newData)).rejects.toBeInstanceOf(
        InvariantError,
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should log REJECTED -> DRAFT when editing a rejected PR', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'REJECTED' })], rowCount: 1 }) // lock header
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // update header
        .mockResolvedValueOnce({ rowCount: 2 }) // delete items
        .mockResolvedValueOnce({ rowCount: 1 }) // insert item 1
        .mockResolvedValueOnce({ rowCount: 1 }) // insert item 2
        .mockResolvedValueOnce({ rowCount: 1 }) // insert REJECTED->DRAFT log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // load items
        .mockResolvedValueOnce({ rows: [logRow()], rowCount: 1 }) // load logs
        .mockResolvedValueOnce(undefined); // COMMIT

      await repo.updateDraft('pr1', 'c1', 'u1', newData);
      const logCall = client.query.mock.calls[6];
      expect(logCall[1]).toEqual([
        'pr1',
        'REJECTED',
        'DRAFT',
        'u1',
        'Diperbarui dan dikembalikan ke draft',
      ]);
    });

    it('should throw NotFoundError when PR does not exist', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // lock header -> none

      await expect(repo.updateDraft('pr1', 'c1', 'u1', newData)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('status transitions', () => {
    it('submit: DRAFT -> SUBMITTED writes a log and commits', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rowCount: 1 }) // insert log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [logRow({ to_status: 'SUBMITTED' })], rowCount: 1 }) // logs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.submit('pr1', 'c1', 'u1');
      expect(result.status).toBe('SUBMITTED');
      const logCall = client.query.mock.calls[3];
      expect(logCall[1]).toEqual(['pr1', 'DRAFT', 'SUBMITTED', 'u1', null]);
    });

    it('approve: rejects an invalid transition from DRAFT', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }); // lock

      await expect(repo.approve('pr1', 'c1', 'u1', null)).rejects.toBeInstanceOf(InvariantError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('approve: SUBMITTED -> APPROVED sets approved_by/at and logs', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'SUBMITTED' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({ rows: [header({ status: 'APPROVED' })], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rowCount: 1 }) // log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [logRow({ to_status: 'APPROVED' })], rowCount: 1 }) // logs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.approve('pr1', 'c1', 'u1', 'ok');
      expect(result.status).toBe('APPROVED');
      const updateCall = client.query.mock.calls[2];
      expect(updateCall[0]).toContain('approved_by = $2');
      expect(updateCall[0]).toContain('approved_at = NOW()');
    });

    it('cancel: DRAFT -> CANCELLED soft-deletes (sets deleted_at) and logs', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [header({ status: 'DRAFT' })], rowCount: 1 }) // lock
        .mockResolvedValueOnce({ rows: [header({ status: 'CANCELLED' })], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rowCount: 1 }) // log
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [logRow({ to_status: 'CANCELLED' })], rowCount: 1 }) // logs
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.cancel('pr1', 'c1', 'u1', null);
      expect(result.status).toBe('CANCELLED');
      const updateCall = client.query.mock.calls[2];
      expect(updateCall[0]).toContain('deleted_at = NOW()');
    });
  });

  describe('getById', () => {
    it('should throw NotFoundError when the PR is missing or soft-deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.getById('pr1', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should return header + items + timeline', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [logRow()], rowCount: 1 }); // logs

      const result = await repo.getById('pr1', 'c1');
      expect(result.items).toHaveLength(1);
      expect(result.statusLogs).toHaveLength(1);
      expect(result.statusLogs[0].toStatus).toBe('DRAFT');
      // actorName is resolved via LEFT JOIN to users
      expect(result.statusLogs[0].actorName).toBe('Budi Owner');
    });

    it('should LEFT JOIN users to resolve the status-log actor name', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // header
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items
        .mockResolvedValueOnce({ rows: [logRow()], rowCount: 1 }); // logs

      await repo.getById('pr1', 'c1');
      const logQuery = (mockPool.query as jest.Mock).mock.calls[2][0] as string;
      expect(logQuery).toContain('LEFT JOIN users');
      expect(logQuery).toContain('AS actor_name');
    });
  });

  describe('comments', () => {
    it('ensureExists throws NotFoundError when the PR is missing/soft-deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(repo.ensureExists('pr1', 'c1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('addComment inserts then returns the comment with resolved authorName', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'cmt-1' }], rowCount: 1 }) // insert
        .mockResolvedValueOnce({ rows: [commentRow()], rowCount: 1 }); // reload with join

      const result = await repo.addComment('pr1', 'c1', 'u1', {
        category: 'INTERNAL',
        body: 'Please review the quantities.',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'cmt-1',
          category: 'INTERNAL',
          body: 'Please review the quantities.',
          authorId: 'u1',
          authorName: 'Budi Owner',
        }),
      );
      const insertCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO purchase_request_comments');
      expect(insertCall[1]).toEqual(['pr1', 'c1', 'u1', 'INTERNAL', 'Please review the quantities.']);
      const reloadCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(reloadCall[0]).toContain('LEFT JOIN users');
    });

    it('listComments returns the thread chronologically, company-scoped', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [commentRow(), commentRow({ id: 'cmt-2', author_name: null, author_id: null })],
        rowCount: 2,
      });

      const result = await repo.listComments('pr1', 'c1');
      expect(result).toHaveLength(2);
      expect(result[1].authorName).toBeNull();
      const listCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(listCall[0]).toContain('c.purchase_request_id = $1 AND c.company_id = $2');
      expect(listCall[0]).toContain('ORDER BY c.created_at ASC');
      expect(listCall[1]).toEqual(['pr1', 'c1']);
    });
  });

  describe('list', () => {
    it('should filter out soft-deleted rows and paginate', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 }) // count
        .mockResolvedValueOnce({ rows: [header()], rowCount: 1 }) // headers
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 }) // items for row
        .mockResolvedValueOnce({ rows: [logRow()], rowCount: 1 }); // logs for row

      const result = await repo.list('c1', { limit: 10, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);
      const countCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('deleted_at IS NULL');
    });
  });
});
