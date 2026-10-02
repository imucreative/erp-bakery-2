<script setup lang="ts">
/**
 * RecipeHeaderFields — header inputs for the Recipe form: recipe name, the
 * FINISHED product this recipe yields ("Produk Jadi"), yield quantity, the
 * yield UOM, and optional preparation instructions. Stateless view: values flow
 * via v-model (name / productId / yieldQty / yieldUomId / instructions) so the
 * parent form owns state, validation, and submission.
 *
 * The "Produk Jadi" picker is deliberately labelled and placed in the header,
 * separate from the per-row ingredient ("Bahan") pickers in the items editor,
 * so the two product contexts are never confused. `disabled` renders read-only.
 */
import { computed } from 'vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'

const props = withDefaults(
  defineProps<{
    name: string
    productId: string
    yieldQty: number
    yieldUomId: string
    instructions: string
    products: Product[]
    uoms: Uom[]
    disabled: boolean
    /**
     * Finished-product ids to HIDE from the picker because they already own a
     * live (DRAFT/ACTIVE) recipe. Empty in edit mode (the current recipe's own
     * product must stay selectable). Supplied by the parent form in create mode.
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
}>()

const productMap = computed<Map<string, Product>>(
  () => new Map(props.products.map((p) => [p.id, p])),
)

/**
 * When the finished product changes, propagate it and auto-default the yield UOM
 * to the product's base UOM — but only when the user has not already set/changed
 * a yield UOM (never overwrite an existing value, so loaded/edited recipes keep
 * their stored UOM).
 */
function onProductChange(value: string): void {
  emit('update:productId', value)
  if (!props.yieldUomId) {
    const product = productMap.value.get(value)
    if (product?.uomId) {
      emit('update:yieldUomId', product.uomId)
    }
  }
}

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

function productLabel(product: Product): string {
  return `${product.name} (${product.sku})`
}

/**
 * Finished products sorted by name, with any product that already owns a live
 * recipe filtered out. The currently-selected product is always kept (edit mode,
 * or a value that is otherwise blocked) so the picker never drops the active
 * selection.
 */
const sortedProducts = computed<Product[]>(() => {
  const blocked = new Set(props.blockedProductIds)
  return [...props.products]
    .filter((p) => !blocked.has(p.id) || p.id === props.productId)
    .sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Recipe name -->
      <div class="sm:col-span-2">
        <label :class="labelClass">Nama Resep<span class="text-error-500">*</span></label>
        <input
          :value="props.name"
          type="text"
          :disabled="props.disabled"
          placeholder="mis. Roti Tawar Klasik"
          :class="inputClass"
          @input="emit('update:name', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Finished product (Produk Jadi) -->
      <div>
        <label :class="labelClass">Produk Jadi<span class="text-error-500">*</span></label>
        <div class="relative">
          <select
            :value="props.productId"
            :disabled="props.disabled"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="onProductChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih produk jadi</option>
            <option v-for="product in sortedProducts" :key="product.id" :value="product.id">
              {{ productLabel(product) }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Produk jadi yang dihasilkan oleh resep ini.
        </p>
      </div>

      <!-- Yield qty + yield UOM -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label :class="labelClass">Hasil / Batch<span class="text-error-500">*</span></label>
          <input
            :value="props.yieldQty"
            type="number"
            min="0"
            step="any"
            :disabled="props.disabled"
            :class="inputClass"
            @input="emit('update:yieldQty', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div>
          <label :class="labelClass">UOM Hasil<span class="text-error-500">*</span></label>
          <div class="relative">
            <select
              :value="props.yieldUomId"
              :disabled="props.disabled"
              :class="[inputClass, 'appearance-none pe-10']"
              @change="emit('update:yieldUomId', ($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>Pilih UOM</option>
              <option v-for="uom in props.uoms" :key="uom.id" :value="uom.id">
                {{ uom.name }}
              </option>
            </select>
            <ChevronDownIcon
              class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>
      </div>
    </div>

    <div>
      <label :class="labelClass">Instruksi</label>
      <textarea
        :value="props.instructions"
        rows="3"
        :disabled="props.disabled"
        placeholder="Instruksi persiapan / langkah produksi (opsional)..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:instructions', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
