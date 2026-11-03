import {
  asPostgresError,
  isInternalPostgresError,
  translatePostgresError,
} from '../PostgresErrorTranslator';
import { ConflictError } from '../ConflictError';
import { InvariantError } from '../InvariantError';

describe('asPostgresError', () => {
  it('should extract diagnostic fields from a pg DatabaseError shape', () => {
    const error = Object.assign(new Error('duplicate key value'), {
      code: '23505',
      detail: 'Key (company_id, code)=(abc, PC-001) already exists.',
      constraint: 'product_categories_company_id_code_key',
      table: 'product_categories',
      schema: 'public',
    });

    expect(asPostgresError(error)).toEqual({
      code: '23505',
      detail: 'Key (company_id, code)=(abc, PC-001) already exists.',
      constraint: 'product_categories_company_id_code_key',
      table: 'product_categories',
      schema: 'public',
      column: undefined,
    });
  });

  it('should return null for a plain Error', () => {
    expect(asPostgresError(new Error('boom'))).toBeNull();
  });

  it('should return null for non-object values', () => {
    expect(asPostgresError('boom')).toBeNull();
    expect(asPostgresError(null)).toBeNull();
    expect(asPostgresError(undefined)).toBeNull();
  });

  it('should ignore a code that is not a 5-character SQLSTATE', () => {
    // Node system errors also carry `code`, e.g. ENOENT / ECONNREFUSED.
    expect(asPostgresError(Object.assign(new Error('nope'), { code: 'ENOENT' }))).toBeNull();
    expect(asPostgresError(Object.assign(new Error('nope'), { code: 42 }))).toBeNull();
  });
});

describe('isInternalPostgresError', () => {
  it.each([
    ['42703', 'undefined_column'],
    ['42P01', 'undefined_table'],
    ['42601', 'syntax_error'],
    ['08006', 'connection_failure'],
    ['53300', 'too_many_connections'],
    ['XX000', 'internal_error'],
  ])('should treat %s (%s) as our own defect', (code) => {
    expect(isInternalPostgresError({ code })).toBe(true);
  });

  it.each([['23505'], ['23503'], ['40001'], ['22P02']])(
    'should treat %s as user-actionable',
    (code) => {
      expect(isInternalPostgresError({ code })).toBe(false);
    },
  );
});

describe('translatePostgresError', () => {
  it('should name the conflicting columns on a unique violation', () => {
    const result = translatePostgresError({
      code: '23505',
      detail: 'Key (company_id, code)=(abc, PC-001) already exists.',
      table: 'product_categories',
    });

    expect(result).toBeInstanceOf(ConflictError);
    expect(result?.statusCode).toBe(409);
    expect(result?.message).toContain('code');
    // company_id is a tenancy column, not something the user typed.
    expect(result?.message).not.toContain('company_id');
  });

  it('should fall back to the table name when detail has no key list', () => {
    const result = translatePostgresError({ code: '23505', table: 'product_categories' });

    expect(result).toBeInstanceOf(ConflictError);
    expect(result?.message).toContain('product categories');
  });

  it('should explain a foreign key violation as a bad reference', () => {
    const result = translatePostgresError({ code: '23503', table: 'production_orders' });

    expect(result).toBeInstanceOf(InvariantError);
    expect(result?.statusCode).toBe(400);
    expect(result?.message).toContain('direferensikan');
  });

  it('should name the missing column on a not-null violation', () => {
    const result = translatePostgresError({ code: '23502', column: 'outlet_id' });

    expect(result).toBeInstanceOf(InvariantError);
    expect(result?.message).toContain('outlet_id');
  });

  it('should still be useful when a not-null violation has no column', () => {
    expect(translatePostgresError({ code: '23502' })?.message).toContain('wajib');
  });

  it('should ask the user to retry on a serialization failure', () => {
    const result = translatePostgresError({ code: '40001' });

    expect(result).toBeInstanceOf(ConflictError);
    expect(result?.message).toContain('coba lagi');
  });

  it('should flag malformed input as a format problem', () => {
    expect(translatePostgresError({ code: '22P02' })?.message).toContain('Format data tidak valid');
  });

  it('should return null for codes it cannot make actionable', () => {
    expect(translatePostgresError({ code: '42703' })).toBeNull();
    expect(translatePostgresError({ code: '99999' })).toBeNull();
    expect(translatePostgresError({})).toBeNull();
  });
});
