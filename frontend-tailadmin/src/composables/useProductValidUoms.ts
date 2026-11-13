/**
 * useProductValidUoms — resolves, per product, the VALID units of measure a
 * transactional line item (Purchase Request / Purchase Order) may use.
 *
 * Global model (doc 52 B2):
 *   valid UOMs for product X = { X's base unit }
 *                            ∪ { active UOMs in the SAME dimension as the base }
 *
 * The list is derived from the UOM master already loaded by the editor, so no
 * per-product API call is needed. If the base UOM has no dimension/factor
 * metadata yet, only the base unit is offered (safe fallback).
 */
import type { Uom } from '@/services/uom.service'

/** A single selectable UOM option for a transactional line item. */
export interface ValidUomOption {
  id: string
  label: string
}

/** How the caller resolves a product's base unit and the loaded UOM master. */
export interface BaseUomResolver {
  /** The product's base UOM id (`products.uomId`), or '' when unresolved. */
  baseUomId: (productId: string) => string
  /** Human label for a UOM id (falls back gracefully when missing). */
  baseUomLabel: (uomId: string) => string
  /** All UOMs loaded by the editor (active/inactive included; filter here). */
  uoms: () => Uom[]
}

export function useProductValidUoms(resolver: BaseUomResolver) {
  /**
   * The valid UOM options for a product: its base unit first, then active UOMs
   * in the same physical dimension. Returns [] when the product is unknown.
   */
  function validUoms(productId: string): ValidUomOption[] {
    if (!productId) {
      return []
    }
    const baseId = resolver.baseUomId(productId)
    if (!baseId) {
      return []
    }

    const all = resolver.uoms()
    const base = all.find((uom) => uom.id === baseId)
    const options: ValidUomOption[] = [
      { id: baseId, label: base?.name ?? resolver.baseUomLabel(baseId) },
    ]

    // Without metadata we cannot safely offer other units.
    if (!base?.dimension || base.factorToCanonical === null) {
      return options
    }

    for (const uom of all) {
      if (
        uom.id === baseId ||
        !uom.isActive ||
        !uom.dimension ||
        uom.factorToCanonical === null ||
        uom.dimension !== base.dimension
      ) {
        continue
      }
      options.push({ id: uom.id, label: uom.name })
    }
    return options
  }

  /** True when `uomId` is a valid unit for the given product. */
  function isValidUom(productId: string, uomId: string): boolean {
    if (!productId || !uomId) {
      return false
    }
    return validUoms(productId).some((option) => option.id === uomId)
  }

  // Kept for callers that still wire the old async lifecycle; global data is
  // already loaded, so there is nothing to fetch.
  function ensureLoaded(_productId: string): void {
    void _productId;
  }

  function isLoading(_productId: string): boolean {
    void _productId;
    return false
  }

  return {
    ensureLoaded,
    validUoms,
    isValidUom,
    isLoading,
  }
}
