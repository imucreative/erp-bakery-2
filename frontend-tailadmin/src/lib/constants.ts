// src/lib/constants.ts
/** Product types that can be ordered via Purchase Request.
 *  - RAW_MATERIAL: ingredients that must be bought.
 *  - PACKAGING: external packaging items (e.g., bottles).
 *  - MERCHANDISE: sellable items that are purchased, not produced.
 *  Add more types here if new purchasable categories appear.
 */
export const PURCHASABLE_PRODUCT_TYPES = [
    'RAW_MATERIAL',
    'PACKAGING',
    'BEVERAGE'
] as const;
