<script setup lang="ts">
/**
 * RecipeItemsEditor — ingredient ("Bahan") line-items grid for the Recipe form.
 *
 * Each row defines one ingredient of the BOM: a raw-material / ingredient
 * product (`ingredientProductId`), a base quantity per batch (`qty` > 0), the
 * ingredient's UOM (`uomId`), and an optional wastage allowance
 * (`lossPercentage`, 0..100, default 0). The ingredient picker is labelled
 * "Bahan" to keep it clearly distinct from the header's finished-product
 * ("Produk Jadi") picker.
 *
 * Rows are added via "Tambah Bahan" (an empty row the user fills in). Stateless:
 * values flow via v-model; the parent form owns validation and the API payload.
 */
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { PlusIcon } from '@/icons'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'

/** A single editable row (local editor shape; parent maps to the API payload). */
export interface RecipeEditorItemRow {
  ingredientProductId: string
  qty: number
  uomId: string
  lossPercentage: number
}

const props = defineProps<{
  modelValue: RecipeEditorItemRow[]
  products: Product[]
  uoms: Uom[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', rows: RecipeEditorItemRow[]): void
}>()

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'

/** Ingredient products sorted by name for a tidy picker. */
const sortedProducts = computed<Product[]>(() =>
  [...props.products].sort((a, b) => a.name.localeCompare(b.name)),
)

function productLabel(product: Product): string {
  return `${product.name} (${product.sku})`
}

function emitRows(rows: RecipeEditorItemRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<RecipeEditorItemRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}

function addRow(): void {
  emitRows([
    ...props.modelValue,
    {
      ingredientProductId: '',
      qty: 1,
      uomId: '',
      lossPercentage: 0,
    },
  ])
}

function removeRow(index: number): void {
  emitRows(props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <th class="w-80 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Bahan
            </th>
            <th class="w-28 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th class="w-40 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              UOM
            </th>
            <th class="w-32 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Loss %
            </th>
            <th class="w-16 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in modelValue"
            :key="index"
            class="border-b border-gray-100 last:border-0 dark:border-gray-800"
          >
            <!-- Ingredient (Bahan) picker -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.ingredientProductId"
                  :disabled="disabled"
                  :class="[inputClass, 'appearance-none pe-10']"
                  @change="updateRow(index, { ingredientProductId: ($event.target as HTMLSelectElement).value })"
                >
                  <option value="" disabled>Pilih bahan...</option>
                  <option v-for="product in sortedProducts" :key="product.id" :value="product.id">
                    {{ productLabel(product) }}
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
            </td>
            <!-- Qty -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.qty"
                type="number"
                min="0"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { qty: Number(($event.target as HTMLInputElement).value) })"
              />
            </td>
            <!-- UOM -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.uomId"
                  :disabled="disabled"
                  :class="[inputClass, 'appearance-none pe-10']"
                  @change="updateRow(index, { uomId: ($event.target as HTMLSelectElement).value })"
                >
                  <option value="" disabled>Pilih UOM...</option>
                  <option v-for="uom in uoms" :key="uom.id" :value="uom.id">
                    {{ uom.name }}
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
            </td>
            <!-- Loss percentage -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.lossPercentage"
                type="number"
                min="0"
                max="100"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { lossPercentage: Number(($event.target as HTMLInputElement).value) })"
              />
            </td>
            <!-- Remove -->
            <td class="px-4 py-3 text-end align-top">
              <button
                type="button"
                aria-label="Hapus baris"
                title="Hapus baris"
                :disabled="disabled"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-error-500 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-error-500/30 dark:hover:bg-error-500/10"
                @click="removeRow(index)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </button>
            </td>
          </tr>

          <tr v-if="modelValue.length === 0">
            <td
              colspan="5"
              class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              Belum ada bahan. Tambahkan baris lalu pilih bahan.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add row -->
    <div v-if="!disabled" class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        @click="addRow"
      >
        <PlusIcon class="h-4 w-4" aria-hidden="true" />
        Tambah Bahan
      </button>
    </div>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Setiap baris adalah satu bahan baku untuk satu batch resep. "Loss %" adalah
      kelonggaran susut bahan (0–100), default 0.
    </p>
  </div>
</template>
