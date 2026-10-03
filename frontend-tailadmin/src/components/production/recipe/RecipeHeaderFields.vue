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
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { Search, X } from 'lucide-vue-next'
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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

// ── Finished-product autocomplete (presentation + keyboard nav only) ──
const query = ref<string>('')
const showResults = ref<boolean>(false)
const highlighted = ref<number>(-1)
let blurTimer: ReturnType<typeof setTimeout> | undefined

const blockedSet = computed<Set<string>>(() => new Set(props.blockedProductIds))

function isBlocked(product: Product): boolean {
  // Never block the currently-selected product (edit mode / active selection).
  return blockedSet.value.has(product.id) && product.id !== props.productId
}

function onQueryInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  showResults.value = true
  highlighted.value = -1
  emit('product-search', value.trim())
}

/**
 * Select a finished product. Blocked products (already own a live recipe) are
 * inert — the UI renders them disabled, and this guard ignores a stray trigger.
 * Propagates the product and auto-defaults the yield UOM only when it is still
 * empty (UOM behaviour unchanged).
 */
function selectProduct(product: Product): void {
  if (isBlocked(product)) {
    return
  }
  emit('product-select', product)
  emit('update:productId', product.id)
  if (!props.yieldUomId && product.uomId) {
    emit('update:yieldUomId', product.uomId)
  }
  query.value = ''
  showResults.value = false
  highlighted.value = -1
}

function clearProduct(): void {
  emit('product-clear')
  emit('update:productId', '')
  query.value = ''
  showResults.value = false
  highlighted.value = -1
  void nextTick()
}

function onFocus(): void {
  if (query.value.trim().length > 0) {
    showResults.value = true
  }
}

function onBlur(): void {
  // Delay so a mousedown on an option still registers before close.
  blurTimer = setTimeout(() => {
    showResults.value = false
  }, 150)
}

function onKeydown(event: KeyboardEvent): void {
  if (!showResults.value || props.productResults.length === 0) {
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlighted.value = (highlighted.value + 1) % props.productResults.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlighted.value =
      highlighted.value <= 0 ? props.productResults.length - 1 : highlighted.value - 1
  } else if (event.key === 'Enter') {
    if (highlighted.value >= 0) {
      event.preventDefault()
      const picked = props.productResults[highlighted.value]
      if (picked) {
        selectProduct(picked)
      }
    }
  } else if (event.key === 'Escape') {
    showResults.value = false
    highlighted.value = -1
  }
}
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

      <!-- Finished product (Produk Jadi) — server-side autocomplete -->
      <div>
        <label :class="labelClass">Produk Jadi<span class="text-error-500">*</span></label>

        <!-- Chosen product chip -->
        <div
          v-if="props.productId"
          class="flex h-11 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90"
        >
          <span class="truncate">{{ props.productLabel }}</span>
          <button
            type="button"
            aria-label="Hapus produk terpilih"
            title="Ganti produk"
            :disabled="props.disabled"
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
            @click="clearProduct"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <!-- Search input + results -->
        <div v-else class="relative">
          <div class="relative">
            <span
              class="pointer-events-none absolute inset-y-0 start-3 my-auto flex h-5 w-5 items-center text-gray-400"
            >
              <Search class="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              :value="query"
              type="text"
              placeholder="Ketik untuk mencari produk jadi..."
              :disabled="props.disabled"
              :class="[inputClass, 'ps-10']"
              role="combobox"
              :aria-expanded="showResults"
              aria-autocomplete="list"
              @input="onQueryInput"
              @focus="onFocus"
              @blur="onBlur"
              @keydown="onKeydown"
            />
          </div>

          <div
            v-if="showResults && query.trim().length > 0"
            class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <p
              v-if="props.productSearching"
              class="px-4 py-2 text-theme-sm text-gray-500 dark:text-gray-400"
            >
              Mencari...
            </p>
            <p
              v-else-if="props.productResults.length === 0"
              class="px-4 py-2 text-theme-sm text-gray-500 dark:text-gray-400"
            >
              Produk tidak ditemukan.
            </p>
            <ul v-else>
              <li
                v-for="(product, index) in props.productResults"
                :key="product.id"
                :class="[
                  'px-4 py-2 text-theme-sm',
                  isBlocked(product)
                    ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                    : [
                        'cursor-pointer text-gray-700 dark:text-gray-300',
                        index === highlighted
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                      ],
                ]"
                :aria-disabled="isBlocked(product)"
                @mousedown.prevent="selectProduct(product)"
                @mousemove="highlighted = isBlocked(product) ? -1 : index"
              >
                <span :class="isBlocked(product) ? 'line-through' : ''">
                  {{ product.name }} <span class="text-gray-400">({{ product.sku }})</span>
                </span>
                <span
                  v-if="isBlocked(product)"
                  class="ms-2 text-theme-xs text-warning-600 dark:text-orange-400"
                >
                  — sudah punya resep
                </span>
              </li>
            </ul>
          </div>
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
