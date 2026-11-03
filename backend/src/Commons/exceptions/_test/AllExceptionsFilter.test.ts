import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from '../AllExceptionsFilter';
import { NotFoundError } from '../NotFoundError';

interface SentPayload {
  success: boolean;
  message: string;
  reference?: string;
  errors: unknown;
}

function buildHost(method = 'POST', url = '/api/v1/production/orders', id = 'req-7') {
  const send = jest.fn();
  const status = jest.fn().mockReturnValue({ send });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method, url, id }),
    }),
  } as unknown as ArgumentsHost;

  return {
    host,
    status,
    sentStatus: (): number => status.mock.calls[0][0] as number,
    sentBody: (): SentPayload => send.mock.calls[0][0] as SentPayload,
  };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    filter = new AllExceptionsFilter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should pass a ClientError through with its own status and message', () => {
    const ctx = buildHost();

    filter.catch(new NotFoundError('Resep tidak ditemukan'), ctx.host);

    expect(ctx.sentStatus()).toBe(404);
    expect(ctx.sentBody()).toEqual({
      success: false,
      message: 'Resep tidak ditemukan',
      errors: null,
    });
  });

  it('should translate a domain error code into a user-facing message', () => {
    const ctx = buildHost();

    filter.catch(new Error('RECIPE.NOT_FOUND'), ctx.host);

    expect(ctx.sentStatus()).toBe(404);
    expect(ctx.sentBody().message).not.toBe('RECIPE.NOT_FOUND');
  });

  it('should expand ValidationPipe messages into a field error list', () => {
    const ctx = buildHost();

    filter.catch(
      new BadRequestException({ message: ['scheduledQty harus angka', 'outletId wajib diisi'] }),
      ctx.host,
    );

    expect(ctx.sentStatus()).toBe(400);
    expect(ctx.sentBody()).toEqual({
      success: false,
      message: 'Validasi request gagal',
      errors: [
        { field: null, message: 'scheduledQty harus angka' },
        { field: null, message: 'outletId wajib diisi' },
      ],
    });
  });

  it('should turn a unique violation into a 409 naming the duplicated column', () => {
    const ctx = buildHost();
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      detail: 'Key (company_id, production_number)=(abc, PRD-2026-000001) already exists.',
      constraint: 'production_orders_company_id_production_number_key',
      table: 'production_orders',
    });

    filter.catch(pgError, ctx.host);

    expect(ctx.sentStatus()).toBe(409);
    expect(ctx.sentBody().message).toContain('production_number');
    expect(ctx.sentBody().message).not.toContain('duplicate key');
  });

  it('should turn a serialization failure into a retryable 409', () => {
    const ctx = buildHost();
    const pgError = Object.assign(new Error('could not serialize access'), { code: '40001' });

    filter.catch(pgError, ctx.host);

    expect(ctx.sentStatus()).toBe(409);
    expect(ctx.sentBody().message).toContain('coba lagi');
  });

  it('should keep a broken query as 500 and never leak the SQL detail', () => {
    const ctx = buildHost();
    const pgError = Object.assign(new Error('missing FROM-clause entry for table "r"'), {
      code: '42P01',
      table: 'recipes',
    });

    filter.catch(pgError, ctx.host);

    expect(ctx.sentStatus()).toBe(500);
    expect(ctx.sentBody().message).not.toContain('FROM-clause');
    expect(ctx.sentBody().message).not.toContain('42P01');
  });

  it('should attach a reference code that matches the logged entry', () => {
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const ctx = buildHost('POST', '/api/v1/production/orders', 'req-42');

    filter.catch(new Error('something exploded'), ctx.host);

    expect(ctx.sentStatus()).toBe(500);
    expect(ctx.sentBody().reference).toBe('req-42');
    expect(ctx.sentBody().message).toContain('req-42');
    expect(errorLog.mock.calls[0][0]).toContain('ref=req-42');
  });

  it('should log postgres diagnostics alongside an unexpected 500', () => {
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const ctx = buildHost();
    const pgError = Object.assign(new Error('missing FROM-clause entry for table "r"'), {
      code: '42P01',
      table: 'recipes',
      constraint: undefined,
    });

    filter.catch(pgError, ctx.host);

    const logged = errorLog.mock.calls[0][0] as string;
    expect(logged).toContain('pg=42P01');
    expect(logged).toContain('table=recipes');
  });

  it('should not crash when the request carries no id', () => {
    const send = jest.fn();
    const status = jest.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/api/v1/health' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('boom'), host);

    expect((send.mock.calls[0][0] as SentPayload).reference).toBe('n/a');
  });

  it('should handle a thrown non-Error value', () => {
    const ctx = buildHost();

    filter.catch('just a string', ctx.host);

    expect(ctx.sentStatus()).toBe(500);
    expect(ctx.sentBody().success).toBe(false);
  });
});
