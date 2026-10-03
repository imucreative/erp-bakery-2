<script setup lang="ts">
/**
 * ProductionOrderHeaderFields — inputs for the INSTANT-COMPLETE production form:
 * outlet, finished-product autocomplete, target/success/waste quantities,
 * result expiry, production date, and notes. Stateless view: values flow via
 * v-model and the parent form owns state, product search, validation and submit.
 *
 * Design decision (user): the user picks a FINISHED PRODUCT, not a recipe. The
 * parent submits `productId`; the backend resolves the product's ACTIVE recipe.
 * To avoid loading every product, the product field is a SERVER-SIDE AUTOCOMPLETE:
 * typing emits `product-search` (parent debounces → productService.list) and the
 * dropdown renders `productResults`. On select the parent looks up the product's
 * ACTIVE recipe and passes `recipeInfo` (shown read-only) or `recipeMissing`
 * (a soft warning — the backend is still the authority and will reject when no
 * ACTIVE recipe exists).
 *
 * Outlet: when the user may access a single outlet the parent passes a 1-item
 * list and `outletLocked` so the field renders read-only; otherwise a native
 * picker lists only the accessible outlets.
 */
import { nextTick, onBeforeUnmount, ref } from 'vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { Search, X } from 'lucide-vue-next'
import type { Outlet } from '@/services/outlet.service'
import type { Product } from '@/services/product.service'

const props = defineProps<{
  outletId: string
  productId: string
  /** Display label of the chosen product (name + sku), empty when none. */
  productLabel: string
  scheduledQty: number | null
  actualQty: number | null
  wasteQty: number | null
  resultExpiredDate: string
  productionDate: string
  notes: string
  /** Accessible outlets (already filtered server-side). */
  outlets: Outlet[]
  /** True when the user has exactly one accessible outlet → render read-only. */
  outletLocked: boolean
  /** Server-side autocomplete results for the current query. */
  productResults: Product[]
  productSearching: boolean
  disabled: boolean
  /** Resolved ACTIVE recipe label for the chosen product (read-only info). */
  recipeInfo: string | null
  /** True when the chosen product has no ACTIVE recipe (soft warning). */
  recipeMissing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:outletId', value: string): void
  (e: 'update:scheduledQty', value: number | null): void
  (e: 'update:actualQty', value: number | null): void
  (e: 'update:wasteQty', value: number | null): void
  (e: 'update:resultExpiredDate', value: string): void
  (e: 'update:productionDate', value: string): void
  (e: 'update:notes', value: string): void
  (e: 'product-search', query: string): void
  (e: 'product-select', product: Product): void
  (e: 'product-clear'): void
}>()

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

// ── Product autocomplete (presentation + keyboard nav only) ───────────
const query = ref<string>('')
const showResults = ref<boolean>(false)
const highlighted = ref<number>(-1)
let blurTimer: ReturnType<typeof setTimeout> | undefined

function onQueryInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  showResults.value = true
  highlighted.value = -1
  emit('product-search', value.trim())
}

function selectProduct(product: Product): void {
  emit('product-select', product)
  query.value = ''
  showResults.value = false
  highlighted.value = -1
}

function clearProduct(): void {
  emit('product-clear')
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

function onQtyInput(event: Event, field: 'scheduledQty' | 'actualQty' | 'wasteQty'): void {
  const raw = (event.target as HTMLInputElement).value
  const value = raw === '' ? null : Number(raw)
  if (field === 'scheduledQty') {
    emit('update:scheduledQty', value)
  } else if (field === 'actualQty') {
    emit('update:actualQty', value)
  } else {
    emit('update:wasteQty', value)
  }
}

onBeforeUnmount(() => {
  if (blurTimer) {
    clearTimeout(blurTimer)
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Outlet -->
      <div>
        <label :class="labelClass">Outlet<span class="text-error-500">*</span></label>
        <div v-if="props.outletLocked" class="relative">
          <input
            :value="props.outlets[0]?.name ?? ''"
            type="text"
            readonly
            disabled
            :class="inputClass"
          />
        </div>
        <div v-else class="relative">
          <select
            :value="props.outletId"
            :disabled="props.disabled"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:outletId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih outlet</option>
            <option v-for="outlet in props.outlets" :key="outlet.id" :value="outlet.id">
              {{ outlet.name }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>

      <!-- Finished product (server-side autocomplete) -->
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
                  'cursor-pointer px-4 py-2 text-theme-sm text-gray-700 dark:text-gray-300',
                  index === highlighted
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                ]"
                @mousedown.prevent="selectProduct(product)"
                @mousemove="highlighted = index"
              >
                {{ product.name }} <span class="text-gray-400">({{ product.sku }})</span>
              </li>
            </ul>
          </div>
        </div>

        <p
          v-if="props.recipeMissing"
          class="mt-1 text-theme-xs text-warning-600 dark:text-orange-400"
        >
          Produk ini belum memiliki resep aktif. Produksi kemungkinan ditolak backend.
        </p>
        <p v-else class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          <template v-if="props.recipeInfo">
            Resep aktif: <span class="text-gray-600 dark:text-gray-300">{{ props.recipeInfo }}</span>
          </template>
          <template v-else>
            Pilih produk jadi yang memiliki resep aktif.
          </template>
        </p>
      </div>

      <!-- Target (scheduled) -->
      <div>
        <label :class="labelClass">Target<span class="text-error-500">*</span></label>
        <input
          :value="props.scheduledQty ?? ''"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :disabled="props.disabled"
          placeholder="0"
          :class="inputClass"
          @input="onQtyInput($event, 'scheduledQty')"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Jumlah barang jadi yang ditargetkan.
        </p>
      </div>

      <!-- Success (actual) -->
      <div>
        <label :class="labelClass">Berhasil<span class="text-error-500">*</span></label>
        <input
          :value="props.actualQty ?? ''"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :disabled="props.disabled"
          placeholder="0"
          :class="inputClass"
          @input="onQtyInput($event, 'actualQty')"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Barang jadi yang berhasil dan masuk ke stok.
        </p>
      </div>

      <!-- Waste -->
      <div>
        <label :class="labelClass">Gagal / Terbuang</label>
        <input
          :value="props.wasteQty ?? ''"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :disabled="props.disabled"
          placeholder="0"
          :class="inputClass"
          @input="onQtyInput($event, 'wasteQty')"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Jumlah yang gagal/terbuang dan tidak masuk stok.
        </p>
      </div>

      <!-- Result expiry (required when actual > 0) -->
      <div>
        <label :class="labelClass">
          Tanggal Kedaluwarsa Hasil
          <span v-if="(props.actualQty ?? 0) > 0" class="text-error-500">*</span>
        </label>
        <input
          :value="props.resultExpiredDate"
          type="date"
          :disabled="props.disabled"
          :class="inputClass"
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          @input="emit('update:resultExpiredDate', ($event.target as HTMLInputElement).value)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Kedaluwarsa batch barang jadi (wajib bila Berhasil &gt; 0).
        </p>
      </div>

      <!-- Production date -->
      <div>
        <label :class="labelClass">Tanggal Produksi</label>
        <input
          :value="props.productionDate"
          type="date"
          :disabled="props.disabled"
          :class="inputClass"
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          @input="emit('update:productionDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <textarea
        :value="props.notes"
        rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional — alasan terbuang: gosong / tester / dll."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
