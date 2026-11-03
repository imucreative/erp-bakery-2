import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OwnerDashboardQueryDto } from '../../dashboard/dto/owner-dashboard-query.dto';
import { SalesReportQueryDto } from '../dto/sales-report-query.dto';

function transform<T extends object>(type: new () => T, payload: object): T {
  return plainToInstance(type, payload, { enableImplicitConversion: true });
}

describe('top-products query DTOs', () => {
  it('accepts and converts supported owner dashboard options', async () => {
    const dto = transform(OwnerDashboardQueryDto, {
      periodDays: '30',
      topProductsLimit: '20',
    });

    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ periodDays: 30, topProductsLimit: 20 });
  });

  it.each([
    { periodDays: '8' },
    { topProductsLimit: '100' },
  ])('rejects unsupported owner dashboard options: %o', async (payload) => {
    const errors = await validate(transform(OwnerDashboardQueryDto, payload));
    expect(errors).toHaveLength(1);
  });

  it('accepts and converts a supported sales report limit', async () => {
    const dto = transform(SalesReportQueryDto, {
      dateFrom: '2026-10-01',
      dateTo: '2026-10-28',
      topProductsLimit: '50',
    });

    expect(await validate(dto)).toEqual([]);
    expect(dto.topProductsLimit).toBe(50);
  });

  it('rejects an unsupported sales report limit', async () => {
    const dto = transform(SalesReportQueryDto, {
      dateFrom: '2026-10-01',
      dateTo: '2026-10-28',
      topProductsLimit: '7',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(['topProductsLimit']);
  });
});
