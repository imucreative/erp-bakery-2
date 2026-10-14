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
 *
 * The ingredient picker is a TEXT AUTOCOMPLETE, replacing the old native
 * <select> that rendered every raw material. The interaction itself (chip, search
 * input, dropdown, keyboard nav, aria) is the shared `EntityCombobox`, used here
 * in `mode="client"`: the parent already loads the RAW_MATERIAL masters, so the
 * filtering happens locally instead of firing a request per keystroke.
 *
 * An ingredient already picked in ANOTHER row is rendered disabled ("sudah
 * dipakai di baris lain"), mirroring the header's "sudah punya resep" rule, so
 * the duplicate that `RecipeForm.validate()` rejects can never be picked. A row's
 * own current ingredient is never blocked, so it stays re-selectable.
 */
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
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

const productMap = computed<Map<string, Product>>(
  () => new Map(props.products.map((p) => [p.id, p])),
)

/**
 * Suggestions are listed alphabetically by name, matching the old <select>'s
 * `sortedProducts`. Sorting lives here rather than inside `EntityCombobox` so the
 * primitive stays dumb about presentation order.
 */
const sortedProducts = computed<Product[]>(() =>
  [...props.products].sort((a, b) => a.name.localeCompare(b.name)),
)

/** Ids picked by any row; a row's own id is excluded by the adapter below. */
const usedProductIds = computed<Set<string>>(
  () => new Set(props.modelValue.map((row) => row.ingredientProductId).filter(Boolean)),
)

function ingredientLabel(product: Product): string {
  return `${product.name} (${product.sku})`
}

/** Label for a chosen ingredient, falling back to the id when unresolvable. */
function chosenLabel(row: RecipeEditorItemRow): string {
  const product = productMap.value.get(row.ingredientProductId)
  return product ? ingredientLabel(product) : row.ingredientProductId
}

/**
 * An ingredient is blocked when another row already picked it. Comparing against
 * the row's own id keeps the current choice re-selectable (edit / replace).
 */
function makeBlockedTest(index: number): (product: Product) => boolean {
  const ownId = props.modelValue[index]?.ingredientProductId
  const used = usedProductIds.value
  return (product: Product) => product.id !== ownId && used.has(product.id)
}

function emitRows(rows: RecipeEditorItemRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<RecipeEditorItemRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}

/**
 * Pick an ingredient. Auto-defaults this row's UOM to the ingredient's base UOM
 * only when the row has no UOM yet, so a loaded/edited row keeps its stored UOM
 * and a manual override is never overwritten (behaviour unchanged from the old
 * <select>).
 */
function chooseIngredient(index: number, product: Product): void {
  const row = props.modelValue[index]
  const patch: Partial<RecipeEditorItemRow> = { ingredientProductId: product.id }
  if (row && !row.uomId && product.uomId) {
    patch.uomId = product.uomId
  }
  updateRow(index, patch)
}

/**
 * Clear the ingredient. The row's UOM is reset ONLY when it still equals the
 * removed ingredient's base UOM (i.e. it was the auto-default) — a UOM the user
 * picked by hand is preserved.
 */
function clearIngredient(index: number): void {
  const row = props.modelValue[index]
  const previous = row ? productMap.value.get(row.ingredientProductId) : undefined
  const patch: Partial<RecipeEditorItemRow> = { ingredientProductId: '' }
  if (row && row.uomId && previous && row.uomId === previous.uomId) {
    patch.uomId = ''
  }
  updateRow(index, patch)
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
    <!-- The grid scrolls horizontally on narrow screens only. Its height is fixed
         by the row count; `overflow-y-hidden` guarantees the combobox dropdown can
         never turn this wrapper into a vertical scroll container (CSS would
         otherwise compute overflow-y to auto because overflow-x is not visible). -->
    <div
      class="overflow-x-auto overflow-y-hidden rounded-xl border border-gray-200 dark:border-gray-800"
    >
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <th
              class="w-80 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Bahan
            </th>
            <th
              class="w-28 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Qty
            </th>
            <th
              class="w-40 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              UOM
            </th>
            <th
              class="w-32 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Loss %
            </th>
            <th
              class="w-16 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
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
            <!-- Ingredient (Bahan) picker — text autocomplete, client-filtered -->
            <td class="px-4 py-3 align-top">
              <EntityCombobox
                :model-value="row.ingredientProductId"
                :selected-label="chosenLabel(row)"
                :items="sortedProducts"
                :item-id="(product) => product.id"
                :item-label="ingredientLabel"
                :item-disabled="makeBlockedTest(index)"
                item-disabled-hint="sudah dipakai di baris lain"
                mode="client"
                :max-suggestions="50"
                :visible-item-count="10"
                placeholder="Ketik untuk mencari bahan..."
                empty-text="Bahan tidak ditemukan."
                :aria-label="`Bahan baris ${index + 1}`"
                :clear-aria-label="`Hapus bahan baris ${index + 1}`"
                :disabled="disabled"
                @select="chooseIngredient(index, $event)"
                @clear="clearIngredient(index)"
              />
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
                @input="
                  updateRow(index, { qty: Number(($event.target as HTMLInputElement).value) })
                "
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
                @input="
                  updateRow(index, {
                    lossPercentage: Number(($event.target as HTMLInputElement).value),
                  })
                "
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
              Belum ada bahan. Tambahkan baris lalu ketik untuk mencari bahan.
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
      Setiap baris adalah satu bahan baku untuk satu batch resep. "Loss %" adalah kelonggaran susut
      bahan (0–100), default 0. Bahan yang sudah dipakai di baris lain tidak bisa dipilih lagi.
    </p>
  </div>
</template>
