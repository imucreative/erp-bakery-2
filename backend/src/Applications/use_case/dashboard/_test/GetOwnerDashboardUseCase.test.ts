import { GetOwnerDashboardUseCase } from '../GetOwnerDashboardUseCase';
import { DashboardRepository } from '../../../../Domains/dashboard/DashboardRepository';
import { OwnerDashboardSummary } from '../../../../Domains/dashboard/entities/DashboardSummary';

const mockRepo: jest.Mocked<DashboardRepository> = {
  getOwnerSummary: jest.fn(),
  getOutletSummary: jest.fn(),
} as unknown as jest.Mocked<DashboardRepository>;

const companyId = 'company-uuid';
const outletId = 'outlet-uuid';

const summary = new OwnerDashboardSummary({
  revenueToday: 4000,
  salesToday: 1,
  lowStockCount: 0,
  expiredCount: 3,
  salesTrend: [],
  expiringSoon: [],
  topProducts: [],
});

describe('GetOwnerDashboardUseCase', () => {
  let useCase: GetOwnerDashboardUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetOwnerDashboardUseCase(mockRepo);
    mockRepo.getOwnerSummary.mockResolvedValue(summary);
  });

  it('should request a company-wide summary when no outlet is given', async () => {
    const result = await useCase.execute(companyId);

    expect(result).toBe(summary);
    expect(mockRepo.getOwnerSummary).toHaveBeenCalledWith(companyId, {}, expect.any(Date));
  });

  it('should pass the outlet scope through to the repository', async () => {
    await useCase.execute(companyId, { outletId });

    expect(mockRepo.getOwnerSummary).toHaveBeenCalledWith(
      companyId,
      { outletId },
      expect.any(Date),
    );
  });

  it('should pass period and limit through to the repository', async () => {
    await useCase.execute(companyId, { periodDays: 30, topProductsLimit: 20 });

    expect(mockRepo.getOwnerSummary).toHaveBeenCalledWith(
      companyId,
      { periodDays: 30, topProductsLimit: 20 },
      expect.any(Date),
    );
  });

  it('should forward an explicit business date', async () => {
    const businessDate = new Date('2026-10-25T03:00:00.000Z');

    await useCase.execute(companyId, { outletId }, businessDate);

    expect(mockRepo.getOwnerSummary).toHaveBeenCalledWith(companyId, { outletId }, businessDate);
  });
});
