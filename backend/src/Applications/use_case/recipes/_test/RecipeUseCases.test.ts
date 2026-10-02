import { CreateRecipeUseCase } from '../CreateRecipeUseCase';
import { UpdateRecipeUseCase } from '../UpdateRecipeUseCase';
import { ActivateRecipeUseCase } from '../ActivateRecipeUseCase';
import { ArchiveRecipeUseCase } from '../ArchiveRecipeUseCase';
import { DeleteRecipeUseCase } from '../DeleteRecipeUseCase';
import { GetRecipesUseCase } from '../GetRecipesUseCase';
import { RecipeRepository } from '../../../../Domains/recipes/RecipeRepository';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';

const recipeRepo: jest.Mocked<RecipeRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  activate: jest.fn(),
  archive: jest.fn(),
  softDelete: jest.fn(),
  getActiveByProduct: jest.fn(),
} as unknown as jest.Mocked<RecipeRepository>;

const productRepo: jest.Mocked<ProductRepository> = {
  getProductById: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const uomRepo: jest.Mocked<UomRepository> = {
  getUomById: jest.fn(),
} as unknown as jest.Mocked<UomRepository>;

const validPayload = {
  name: 'Roti Tawar',
  productId: 'finished-1',
  yieldQty: 20,
  yieldUomId: 'uom-pcs',
  items: [{ ingredientProductId: 'ing-1', qty: 500, uomId: 'uom-g', lossPercentage: 5 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  productRepo.getProductById.mockResolvedValue({ id: 'x' } as never);
  uomRepo.getUomById.mockResolvedValue({ id: 'u' } as never);
});

describe('CreateRecipeUseCase', () => {
  it('should validate references then create a draft', async () => {
    recipeRepo.createDraft.mockResolvedValue({ id: 'r1' } as never);

    await new CreateRecipeUseCase(recipeRepo, productRepo, uomRepo).execute(validPayload, 'c1');

    // finished product + yield uom + 1 ingredient product + 1 ingredient uom
    expect(productRepo.getProductById).toHaveBeenCalledTimes(2);
    expect(uomRepo.getUomById).toHaveBeenCalledTimes(2);
    expect(recipeRepo.createDraft).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Roti Tawar' }));
  });

  it('should propagate PRODUCT.NOT_FOUND for missing finished product', async () => {
    productRepo.getProductById.mockRejectedValueOnce(new Error('PRODUCT.NOT_FOUND'));

    await expect(
      new CreateRecipeUseCase(recipeRepo, productRepo, uomRepo).execute(validPayload, 'c1'),
    ).rejects.toThrow('PRODUCT.NOT_FOUND');
    expect(recipeRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should reject invalid payload before touching repos', async () => {
    await expect(
      new CreateRecipeUseCase(recipeRepo, productRepo, uomRepo).execute(
        { ...validPayload, items: [] },
        'c1',
      ),
    ).rejects.toThrow('CREATE_RECIPE.ITEMS_REQUIRED');
    expect(productRepo.getProductById).not.toHaveBeenCalled();
  });
});

describe('UpdateRecipeUseCase', () => {
  it('should reject when recipe is not DRAFT', async () => {
    recipeRepo.getById.mockResolvedValue({ status: 'ACTIVE' } as never);

    await expect(
      new UpdateRecipeUseCase(recipeRepo, productRepo, uomRepo).execute('r1', validPayload, 'c1'),
    ).rejects.toThrow('RECIPE.ONLY_DRAFT_EDITABLE');
    expect(recipeRepo.updateDraft).not.toHaveBeenCalled();
  });

  it('should update a DRAFT recipe', async () => {
    recipeRepo.getById.mockResolvedValue({ status: 'DRAFT' } as never);
    recipeRepo.updateDraft.mockResolvedValue({ id: 'r1' } as never);

    await new UpdateRecipeUseCase(recipeRepo, productRepo, uomRepo).execute('r1', validPayload, 'c1');
    expect(recipeRepo.updateDraft).toHaveBeenCalled();
  });
});

describe('Activate/Archive delegate to repository', () => {
  it('activate -> repo.activate', async () => {
    recipeRepo.activate.mockResolvedValue({ id: 'r' } as never);
    await new ActivateRecipeUseCase(recipeRepo).execute('r', 'c1');
    expect(recipeRepo.activate).toHaveBeenCalledWith('r', 'c1');
  });

  it('activate should propagate ACTIVE_ALREADY_EXISTS', async () => {
    recipeRepo.activate.mockRejectedValue(new Error('RECIPE.ACTIVE_ALREADY_EXISTS'));
    await expect(new ActivateRecipeUseCase(recipeRepo).execute('r', 'c1')).rejects.toThrow(
      'RECIPE.ACTIVE_ALREADY_EXISTS',
    );
  });

  it('archive -> repo.archive', async () => {
    recipeRepo.archive.mockResolvedValue({ id: 'r' } as never);
    await new ArchiveRecipeUseCase(recipeRepo).execute('r', 'c1');
    expect(recipeRepo.archive).toHaveBeenCalledWith('r', 'c1');
  });
});

describe('DeleteRecipeUseCase', () => {
  it('delete -> repo.softDelete (company-scoped)', async () => {
    recipeRepo.softDelete.mockResolvedValue(undefined);
    await new DeleteRecipeUseCase(recipeRepo).execute('r', 'c1');
    expect(recipeRepo.softDelete).toHaveBeenCalledWith('r', 'c1');
  });

  it('should propagate ACTIVE_NOT_DELETABLE for ACTIVE recipes', async () => {
    recipeRepo.softDelete.mockRejectedValue(new Error('RECIPE.ACTIVE_NOT_DELETABLE'));
    await expect(new DeleteRecipeUseCase(recipeRepo).execute('r', 'c1')).rejects.toThrow(
      'RECIPE.ACTIVE_NOT_DELETABLE',
    );
  });

  it('should propagate NOT_FOUND', async () => {
    recipeRepo.softDelete.mockRejectedValue(new Error('RECIPE.NOT_FOUND'));
    await expect(new DeleteRecipeUseCase(recipeRepo).execute('missing', 'c1')).rejects.toThrow(
      'RECIPE.NOT_FOUND',
    );
  });
});

describe('GetRecipesUseCase', () => {
  it('should throw INVALID_STATUS for unknown status', async () => {
    await expect(
      new GetRecipesUseCase(recipeRepo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('RECIPE.INVALID_STATUS');
  });

  it('should list with a valid status', async () => {
    recipeRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetRecipesUseCase(recipeRepo).list({ limit: 10, offset: 0, status: 'ACTIVE' }, 'c1');
    expect(recipeRepo.list).toHaveBeenCalled();
  });

  it('should return detail via getById', async () => {
    recipeRepo.getById.mockResolvedValue({ id: 'r' } as never);
    const result = await new GetRecipesUseCase(recipeRepo).detail('r', 'c1');
    expect(result).toEqual({ id: 'r' });
  });
});
