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
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'
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

const labelClass = 'form-label'

// ── Product autocomplete ─────────────────────────────────────────────
// The interaction (chip, search input, dropdown, keyboard nav, aria) is the
// shared `EntityCombobox`; this file only wires the parent's server-side search.
function selectProduct(product: Product): void {
  emit('product-select', product)
}

function updateNullableQty(field: 'scheduledQty' | 'actualQty' | 'wasteQty', value: string): void {
  const quantity = value === '' ? null : Number(value)
  if (field === 'scheduledQty') {
    emit('update:scheduledQty', quantity)
  } else if (field === 'actualQty') {
    emit('update:actualQty', quantity)
  } else {
    emit('update:wasteQty', quantity)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="field-grid">
      <!-- Outlet -->
      <div>
        <label :class="labelClass">Outlet<span class="text-error-500">*</span></label>
        <BaseInput
          v-if="props.outletLocked"
          id="production-order-outlet-locked"
          :model-value="props.outlets[0]?.name ?? ''"
          type="text"
          readonly
          disabled
        />
        <BaseSelect
          v-else
          id="production-order-outlet"
          :model-value="props.outletId"
          :options="props.outlets.map((outlet) => ({ value: outlet.id, label: outlet.name }))"
          :disabled="props.disabled"
          placeholder="Pilih outlet"
          @update:model-value="emit('update:outletId', $event)"
        />
      </div>

      <!-- Finished product (server-side autocomplete) -->
      <div>
        <label :class="labelClass">Produk Jadi<span class="text-error-500">*</span></label>

        <EntityCombobox
          :model-value="props.productId"
          :selected-label="props.productLabel"
          :items="props.productResults"
          :item-id="(product) => product.id"
          :item-label="(product) => `${product.name} (${product.sku})`"
          :searching="props.productSearching"
          searching-text="Mencari..."
          empty-text="Produk tidak ditemukan."
          placeholder="Ketik untuk mencari produk jadi..."
          aria-label="Produk jadi untuk produksi"
          :disabled="props.disabled"
          @search="emit('product-search', $event)"
          @select="selectProduct"
          @clear="emit('product-clear')"
        />

        <p
          v-if="props.recipeMissing"
          class="mt-1 text-theme-xs text-warning-600 dark:text-orange-400"
        >
          Produk ini belum memiliki resep aktif. Produksi kemungkinan ditolak backend.
        </p>
        <p v-else class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          <template v-if="props.recipeInfo">
            Resep aktif:
            <span class="text-gray-600 dark:text-gray-300">{{ props.recipeInfo }}</span>
          </template>
          <template v-else> Pilih produk jadi yang memiliki resep aktif. </template>
        </p>
      </div>

      <!-- Target (scheduled) -->
      <div>
        <label :class="labelClass">Target<span class="text-error-500">*</span></label>
        <BaseInput
          id="production-order-scheduled-qty"
          :model-value="props.scheduledQty ?? ''"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :disabled="props.disabled"
          placeholder="0"
          @update:model-value="updateNullableQty('scheduledQty', $event)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Jumlah barang jadi yang ditargetkan.
        </p>
      </div>

      <!-- Success (actual) -->
      <div>
        <label :class="labelClass">Berhasil<span class="text-error-500">*</span></label>
        <BaseInput
          id="production-order-actual-qty"
          :model-value="props.actualQty ?? ''"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :disabled="props.disabled"
          placeholder="0"
          @update:model-value="updateNullableQty('actualQty', $event)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Barang jadi yang berhasil dan masuk ke stok.
        </p>
      </div>

      <!-- Waste -->
      <div>
        <label :class="labelClass">Gagal / Terbuang</label>
        <BaseInput
          id="production-order-waste-qty"
          :model-value="props.wasteQty ?? ''"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :disabled="props.disabled"
          placeholder="0"
          @update:model-value="updateNullableQty('wasteQty', $event)"
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
        <BaseInput
          id="production-order-result-expiry"
          :model-value="props.resultExpiredDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:resultExpiredDate', $event)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Kedaluwarsa batch barang jadi (wajib bila Berhasil &gt; 0).
        </p>
      </div>

      <!-- Production date -->
      <div>
        <label :class="labelClass">Tanggal Produksi</label>
        <BaseInput
          id="production-order-date"
          :model-value="props.productionDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:productionDate', $event)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="production-order-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional — alasan terbuang: gosong / tester / dll."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
