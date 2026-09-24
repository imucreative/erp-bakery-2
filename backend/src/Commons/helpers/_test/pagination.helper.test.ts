import { parsePagination } from '../pagination.helper';

describe('parsePagination', () => {
  it('should return defaults when no params given', () => {
    const result = parsePagination({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('should parse valid page and limit', () => {
    const result = parsePagination({ page: '3', limit: '20' });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(40);
  });

  it('should enforce minimum page of 1', () => {
    const result = parsePagination({ page: '0' });

    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  it('should enforce minimum limit of 1', () => {
    const result = parsePagination({ limit: '0' });

    expect(result.limit).toBe(1);
  });

  it('should enforce maximum limit of 100', () => {
    const result = parsePagination({ limit: '999' });

    expect(result.limit).toBe(100);
  });

  it('should handle non-numeric strings gracefully', () => {
    const result = parsePagination({ page: 'abc', limit: 'xyz' });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should accept numeric values directly', () => {
    const result = parsePagination({ page: 2, limit: 15 });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(15);
    expect(result.offset).toBe(15);
  });
});
