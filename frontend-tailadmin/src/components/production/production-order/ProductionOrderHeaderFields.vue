<script setup lang="ts">
/**
 * ProductionOrderHeaderFields — header inputs for the Production Order schedule
 * form: outlet, finished product (picker), scheduled quantity, production date,
 * and notes. Stateless view: values flow via v-model so the parent form owns
 * state, validation, and submission.
 *
 * Design decision (user): the user picks a FINISHED PRODUCT, not a recipe. The
 * parent submits `productId`; the backend resolves the product's ACTIVE recipe.
 * The product picker is filtered to products that have an ACTIVE recipe (the
 * parent passes the resolved product list); when a product is chosen we show
 * the resolved recipe name as read-only info. If the product has no ACTIVE
 * recipe the backend rejects the schedule — the parent surfaces that message.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import type { Outlet } from '@/services/outlet.service'
import type { Product } from '@/services/product.service'

const props = defineProps<{
  outletId: string
  productId: string
  scheduledQty: number | null
  productionDate: string
  notes: string
  outlets: Outlet[]
  /** Products the user may schedule (already filtered to ACTIVE-recipe owners). */
  products: Product[]
  disabled: boolean
  /** Resolved recipe label for the chosen product (shown as read-only info). */
  recipeInfo: string | null
}>()

const emit = defineEmits<{
  (e: 'update:outletId', value: string): void
  (e: 'update:productId', value: string): void
  (e: 'update:scheduledQty', value: number | null): void
  (e: 'update:productionDate', value: string): void
  (e: 'update:notes', value: string): void
}>()

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

function onQtyInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  emit('update:scheduledQty', raw === '' ? null : Number(raw))
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Outlet -->
      <div>
        <label :class="labelClass">Outlet<span class="text-error-500">*</span></label>
        <div class="relative">
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

      <!-- Finished product -->
      <div>
        <label :class="labelClass">Produk Jadi<span class="text-error-500">*</span></label>
        <div class="relative">
          <select
            :value="props.productId"
            :disabled="props.disabled"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:productId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih produk jadi</option>
            <option v-for="product in props.products" :key="product.id" :value="product.id">
              {{ product.name }} ({{ product.sku }})
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          <template v-if="props.recipeInfo">
            Resep aktif: <span class="text-gray-600 dark:text-gray-300">{{ props.recipeInfo }}</span>
          </template>
          <template v-else>
            Hanya produk yang memiliki resep aktif yang dapat diproduksi.
          </template>
        </p>
      </div>

      <!-- Scheduled quantity -->
      <div>
        <label :class="labelClass">Qty Rencana<span class="text-error-500">*</span></label>
        <input
          :value="props.scheduledQty ?? ''"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :disabled="props.disabled"
          placeholder="0"
          :class="inputClass"
          @input="onQtyInput"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Jumlah barang jadi yang direncanakan untuk diproduksi.
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
        placeholder="Catatan opsional untuk perintah produksi ini..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
