<script setup lang="ts">
/**
 * RecipeHeaderFields — header inputs for the Recipe form: recipe name, the
 * FINISHED product this recipe yields ("Produk Jadi"), yield quantity, the
 * yield UOM, and optional preparation instructions. Stateless view: values flow
 * via v-model (name / productId / yieldQty / yieldUomId / instructions) so the
 * parent form owns state, validation, and submission.
 *
 * The "Produk Jadi" picker is a SERVER-SIDE AUTOCOMPLETE (identical pattern to
 * ProductionOrderHeaderFields): typing emits `product-search` (the parent
 * debounces → productService.list({ search, productType: FINISHED_GOODS,
 * isActive })) and the dropdown renders `productResults`. Selecting emits
 * `product-select` with the full product (so the parent can set productId, show
 * the chosen label, and auto-default the yield UOM); `product-clear` resets it.
 * This replaces the old "load every product" <select>, which did not scale.
 *
 * The "one live recipe per product" rule is enforced on the search results via
 * `blockedProductIds` (products that already own a DRAFT/ACTIVE recipe): blocked
 * products are rendered DISABLED with a "sudah punya resep" note so they can
 * never be chosen for a new recipe. The currently-selected product is never
 * blocked (edit mode / the active selection stays valid). The backend remains
 * the final authority (activate returns 409 on conflict).
 *
 * This picker is deliberately labelled and placed in the header, separate from
 * the per-row ingredient ("Bahan") pickers in the items editor, so the two
 * product contexts are never confused. `disabled` renders read-only.
 *
 * UOM behaviour is intentionally UNCHANGED (reactive Recipe UOM is deferred to
 * the separate UOM-conversion project): on product select the yield UOM is only
 * auto-defaulted when it is still empty, never overwriting an existing value.
 */
import { computed } from 'vue'
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'

const props = withDefaults(
  defineProps<{
    name: string
    productId: string
    yieldQty: number
    yieldUomId: string
    instructions: string
    uoms: Uom[]
    disabled: boolean
    /** Display label (name + sku) of the chosen finished product, empty when none. */
    productLabel: string
    /** Server-side autocomplete results for the current finished-product query. */
    productResults: Product[]
    productSearching: boolean
    /**
     * Finished-product ids that already own a live (DRAFT/ACTIVE) recipe. Such
     * products are rendered DISABLED in the search results ("sudah punya resep")
     * so a new recipe can never pick them. Empty in edit mode (the current
     * recipe's own product must stay selectable). Supplied by the parent form in
     * create mode.
     */
    blockedProductIds?: string[]
  }>(),
  { blockedProductIds: () => [] },
)

const emit = defineEmits<{
  (e: 'update:name', value: string): void
  (e: 'update:productId', value: string): void
  (e: 'update:yieldQty', value: number): void
  (e: 'update:yieldUomId', value: string): void
  (e: 'update:instructions', value: string): void
  (e: 'product-search', query: string): void
  (e: 'product-select', product: Product): void
  (e: 'product-clear'): void
}>()

const labelClass = 'form-label'

// ── Finished-product autocomplete adapters ───────────────────────────
// The interaction itself (chip, search, dropdown, keyboard nav, aria) lives in
// `EntityCombobox`; this component only supplies the adapters and the side
// effect of auto-defaulting the yield UOM.
const blockedSet = computed<Set<string>>(() => new Set(props.blockedProductIds))

/** Never block the currently-selected product (edit mode / active selection). */
function isBlocked(product: Product): boolean {
  return blockedSet.value.has(product.id) && product.id !== props.productId
}

function selectProduct(product: Product): void {
  emit('product-select', product)
  emit('update:productId', product.id)
  if (!props.yieldUomId && product.uomId) {
    emit('update:yieldUomId', product.uomId)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Recipe name -->
      <div class="sm:col-span-2">
        <label :class="labelClass">Nama Resep<span class="text-error-500">*</span></label>
        <BaseInput
          id="recipe-name"
          :model-value="props.name"
          type="text"
          :disabled="props.disabled"
          placeholder="mis. Roti Tawar Klasik"
          @update:model-value="emit('update:name', $event)"
        />
      </div>

      <!-- Finished product (Produk Jadi) — server-side autocomplete -->
      <div>
        <label :class="labelClass">Produk Jadi<span class="text-error-500">*</span></label>

        <EntityCombobox
          :model-value="props.productId"
          :selected-label="props.productLabel"
          :items="props.productResults"
          :item-id="(product) => product.id"
          :item-label="(product) => `${product.name} (${product.sku})`"
          :item-disabled="isBlocked"
          :searching="props.productSearching"
          searching-text="Mencari..."
          empty-text="Produk tidak ditemukan."
          placeholder="Ketik untuk mencari produk jadi..."
          aria-label="Produk jadi hasil resep"
          :disabled="props.disabled"
          @update:model-value="emit('update:productId', $event)"
          @search="emit('product-search', $event)"
          @select="selectProduct"
          @clear="emit('product-clear')"
        >
          <template #item="{ item: product, disabled }">
            <span :class="disabled ? 'line-through' : ''">
              {{ product.name }} <span class="text-gray-400">({{ product.sku }})</span>
            </span>
            <span v-if="disabled" class="ms-2 text-theme-xs text-warning-600 dark:text-orange-400">
              — sudah punya resep
            </span>
          </template>
        </EntityCombobox>

        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Produk jadi yang dihasilkan oleh resep ini.
        </p>
      </div>

      <!-- Yield qty + yield UOM -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label :class="labelClass">Hasil / Batch<span class="text-error-500">*</span></label>
          <BaseInput
            id="recipe-yield-qty"
            :model-value="props.yieldQty"
            type="number"
            min="0"
            step="any"
            :disabled="props.disabled"
            @update:model-value="emit('update:yieldQty', Number($event))"
          />
        </div>
        <div>
          <label :class="labelClass">UOM Hasil<span class="text-error-500">*</span></label>
          <BaseSelect
            id="recipe-yield-uom"
            :model-value="props.yieldUomId"
            :options="props.uoms.map((uom) => ({ value: uom.id, label: uom.name }))"
            :disabled="props.disabled"
            placeholder="Pilih UOM"
            @update:model-value="emit('update:yieldUomId', $event)"
          />
        </div>
      </div>
    </div>

    <div>
      <label :class="labelClass">Instruksi</label>
      <BaseTextarea
        id="recipe-instructions"
        :model-value="props.instructions"
        :rows="3"
        :disabled="props.disabled"
        placeholder="Instruksi persiapan / langkah produksi (opsional)..."
        @update:model-value="emit('update:instructions', $event)"
      />
    </div>
  </div>
</template>
