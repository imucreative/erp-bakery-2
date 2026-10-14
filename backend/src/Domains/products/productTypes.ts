/**
 * Allowed product types (mirrors the products_product_type_check DB constraint).
 * Shared by the domain entity, DTO validation, and query filters.
 */
export const PRODUCT_TYPES = [
  'RAW_MATERIAL',
  'FINISHED_GOODS',
  'SEMI_FINISHED',
  'PACKAGING',
  'BEVERAGE'
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
