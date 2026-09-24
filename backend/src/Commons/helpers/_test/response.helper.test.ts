import { successResponse, listResponse } from '../response.helper';

describe('response.helper', () => {
  describe('successResponse', () => {
    it('should return success true with data', () => {
      const data = { id: '1', name: 'Test' };
      const result = successResponse(data);

      expect(result).toEqual({ success: true, data });
    });

    it('should work with null data', () => {
      const result = successResponse(null);

      expect(result).toEqual({ success: true, data: null });
    });

    it('should work with array data', () => {
      const data = [1, 2, 3];
      const result = successResponse(data);

      expect(result).toEqual({ success: true, data });
    });
  });

  describe('listResponse', () => {
    it('should return correct meta for paginated list', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const result = listResponse(data, 25, 2, 10);

      expect(result).toEqual({
        success: true,
        data,
        meta: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      });
    });

    it('should calculate totalPages correctly with exact division', () => {
      const result = listResponse([], 20, 1, 10);

      expect(result.meta.totalPages).toBe(2);
    });

    it('should round up totalPages when not exact division', () => {
      const result = listResponse([], 21, 1, 10);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should handle empty results', () => {
      const result = listResponse([], 0, 1, 10);

      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
