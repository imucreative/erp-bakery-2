import { CreateCategory } from '../../../Domains/categories/entities/CreateCategory';
import { ProductCategory } from '../../../Domains/categories/entities/ProductCategory';
import { CategoryRepository } from '../../../Domains/categories/CategoryRepository';
import { ProductGroupRepository } from '../../../Domains/product-groups/ProductGroupRepository';

/**
 * UseCase: CreateCategoryUseCase
 *
 * 1. Validate & normalise input (via CreateCategory domain entity)
 * 2. Confirm the product group exists within the company and is active
 *    (inactive master data must not be selectable for new records)
 * 3. Generate the next code scoped to the company (PC-###)
 * 4. Persist within the company tenant
 */
export class CreateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly productGroupRepository: ProductGroupRepository,
  ) {}

  async execute(payload: unknown, companyId: string): Promise<ProductCategory> {
    const createCategory = new CreateCategory(payload);

    // Throws PRODUCT_GROUP.NOT_FOUND when missing or belonging to another tenant
    const group = await this.productGroupRepository.getProductGroupById(
      createCategory.productGroupId,
      companyId,
    );

    if (!group.isActive) {
      throw new Error('CREATE_CATEGORY.PRODUCT_GROUP_INACTIVE');
    }

    const code = await this.categoryRepository.generateCategoryCode(companyId);

    return this.categoryRepository.addCategory(
      {
        code,
        name: createCategory.name,
        description: createCategory.description,
        productGroupId: createCategory.productGroupId,
      },
      companyId,
    );
  }
}
