/**
 * useProductValidUoms — resolves, per product, the set of VALID units of measure
 * that a transactional line item (Purchase Request / Purchase Order) may use.
 *
 * Business rule (frontend mirror of the backend contract):
 *   valid UOMs for product X = { X's base unit (products.uomId) }
 *                            ∪ { ACTIVE product_uom_conversions registered for X }
 *
 * A product with NO active conversions therefore yields exactly one valid UOM:
 * its base unit (so a line is still orderable without any conversion setup).
 *
 * Data strategy (Opsi A — per-row, on-demand, cached):
 *   - When a row's product is chosen/changed, call `ensureLoaded(productId)` to
 *     fetch `GET /products/:productId/uom-conversions` ONCE and cache the result
 *     keyed by productId. Multiple rows holding the same product share the one
 *     fetch; re-renders never refetch.
 *   - `validUoms(productId)` returns the resolved option list (base + active
 *     conversions) for rendering. Before conversions load it returns just the
 *     base unit (always available), so the select is usable immediately.
 *
 * The caller supplies how to resolve a product's base unit, because each editor
 * already holds the product/uom maps it needs — this composable stays free of
 * props plumbing and avoids duplicating the lookup in both editors.
 */

import { reactive, ref } from 'vue'
import {
  productUomConversionService,
  type ProductUomConversion,
} from '@/services/product-uom-conversion.service'

/** A single selectable UOM option for a transactional line item. */
export interface ValidUomOption {
  id: string
  label: string
}

/** How the caller resolves a product's base unit (id + display name). */
export interface BaseUomResolver {
  /** The product's base UOM id (`products.uomId`), or '' when unresolved. */
  baseUomId: (productId: string) => string
  /** Human label for a UOM id (falls back gracefully when missing). */
  baseUomLabel: (uomId: string) => string
}

export function useProductValidUoms(resolver: BaseUomResolver) {
  /** productId → active conversions (cached once loaded). */
  const conversionsByProduct = reactive(new Map<string, ProductUomConversion[]>())
  /** productId currently being fetched (prevents duplicate in-flight requests). */
  const loadingProducts = ref<Set<string>>(new Set())

  function isLoading(productId: string): boolean {
    return loadingProducts.value.has(productId)
  }

  /**
   * Fetch and cache a product's conversions once. No-op when already cached or
   * in flight, or when productId is empty. Failures leave the product uncached
   * so the UI simply falls back to the base unit (and a later retry may load).
   */
  async function ensureLoaded(productId: string): Promise<void> {
    if (!productId || conversionsByProduct.has(productId) || loadingProducts.value.has(productId)) {
      return
    }
    const next = new Set(loadingProducts.value)
    next.add(productId)
    loadingProducts.value = next
    try {
      const all = await productUomConversionService.list(productId)
      conversionsByProduct.set(
        productId,
        all.filter((conversion) => conversion.isActive),
      )
    } catch {
      // Leave uncached → valid list stays at the base unit; a later select of
      // the same product retries the fetch.
    } finally {
      const done = new Set(loadingProducts.value)
      done.delete(productId)
      loadingProducts.value = done
    }
  }

  /**
   * The valid UOM options for a product: its base unit first, then each active
   * conversion's unit (de-duplicated). Returns [] when the product is unknown.
   */
  function validUoms(productId: string): ValidUomOption[] {
    if (!productId) {
      return []
    }
    const options: ValidUomOption[] = []
    const seen = new Set<string>()

    const baseId = resolver.baseUomId(productId)
    if (baseId) {
      options.push({ id: baseId, label: resolver.baseUomLabel(baseId) })
      seen.add(baseId)
    }

    const conversions = conversionsByProduct.get(productId) ?? []
    for (const conversion of conversions) {
      if (seen.has(conversion.uomId)) {
        continue
      }
      seen.add(conversion.uomId)
      options.push({ id: conversion.uomId, label: conversion.uomName })
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

  return {
    conversionsByProduct,
    ensureLoaded,
    validUoms,
    isValidUom,
    isLoading,
  }
}
