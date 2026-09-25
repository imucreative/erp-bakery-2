import { CreateProduct } from '../../../Domains/products/entities/CreateProduct';
import { Product } from '../../../Domains/products/entities/Product';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { ProductGroupRepository } from '../../../Domains/product-groups/ProductGroupRepository';
import { CategoryRepository } from '../../../Domains/categories/CategoryRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';

/**
 * UseCase: CreateProductUseCase
 *
 * 1. Validate & normalise input (via CreateProduct domain entity)
 * 2. Confirm every referenced master record exists within the company and is active:
 *    product group, category, uom, supplier (each throws its own *.NOT_FOUND / *_INACTIVE)
 * 3. Enforce the cross-reference invariant: the chosen category must belong to the
 *    chosen product group (CREATE_PRODUCT.CATEGORY_GROUP_MISMATCH)
 * 4. Confirm SKU (and barcode when present) uniqueness within the company
 * 5. Persist within the company tenant
 */
export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productGroupRepository: ProductGroupRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly uomRepository: UomRepository,
    private readonly supplierRepository: SupplierRepository,
  ) {}

  async execute(payload: unknown, companyId: string): Promise<Product> {
    const createProduct = new CreateProduct(payload);

    const group = await this.productGroupRepository.getProductGroupById(
      createProduct.productGroupId,
      companyId,
    );
    if (!group.isActive) {
      throw new Error('CREATE_PRODUCT.PRODUCT_GROUP_INACTIVE');
    }

    const category = await this.categoryRepository.getCategoryById(
      createProduct.categoryId,
      companyId,
    );
    if (!category.isActive) {
      throw new Error('CREATE_PRODUCT.CATEGORY_INACTIVE');
    }
    if (category.productGroupId !== createProduct.productGroupId) {
      throw new Error('CREATE_PRODUCT.CATEGORY_GROUP_MISMATCH');
    }

    const uom = await this.uomRepository.getUomById(createProduct.uomId, companyId);
    if (!uom.isActive) {
      throw new Error('CREATE_PRODUCT.UOM_INACTIVE');
    }

    const supplier = await this.supplierRepository.getSupplierById(
      createProduct.supplierId,
      companyId,
    );
    if (!supplier.isActive) {
      throw new Error('CREATE_PRODUCT.SUPPLIER_INACTIVE');
    }

    await this.productRepository.verifyAvailableSku(createProduct.sku, companyId);
    if (createProduct.barcode) {
      await this.productRepository.verifyAvailableBarcode(createProduct.barcode, companyId);
    }

    return this.productRepository.addProduct(
      {
        sku: createProduct.sku,
        barcode: createProduct.barcode,
        name: createProduct.name,
        productGroupId: createProduct.productGroupId,
        categoryId: createProduct.categoryId,
        uomId: createProduct.uomId,
        supplierId: createProduct.supplierId,
        productType: createProduct.productType,
        purchasePrice: createProduct.purchasePrice,
        sellingPrice: createProduct.sellingPrice,
        minimumStock: createProduct.minimumStock,
        shelfLifeDays: createProduct.shelfLifeDays,
        isBatchTracked: createProduct.isBatchTracked,
      },
      companyId,
    );
  }
}
