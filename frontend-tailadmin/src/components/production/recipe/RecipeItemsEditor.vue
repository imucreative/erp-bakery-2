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
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { PlusIcon } from '@/icons'
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
} from '@/components/ui'
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
    <BaseTable aria-label="Editor bahan resep">
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Bahan</BaseTableHead><BaseTableHead>Qty</BaseTableHead
          ><BaseTableHead>UOM</BaseTableHead><BaseTableHead>Loss %</BaseTableHead
          ><BaseTableHead align="end">Aksi</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow v-for="(row, index) in modelValue" :key="index">
          <!-- Ingredient (Bahan) picker — text autocomplete, client-filtered -->
          <BaseTableCell class="align-top">
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
          </BaseTableCell>
          <!-- Qty -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`recipe-qty-${index}`"
              :model-value="row.qty"
              type="number"
              min="0"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { qty: Number($event) })"
            />
          </BaseTableCell>
          <!-- UOM -->
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`recipe-uom-${index}`"
              :model-value="row.uomId"
              :options="uoms.map((uom) => ({ value: uom.id, label: uom.name }))"
              :disabled="disabled"
              placeholder="Pilih UOM..."
              @update:model-value="updateRow(index, { uomId: $event })"
            />
          </BaseTableCell>
          <!-- Loss percentage -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`recipe-loss-${index}`"
              :model-value="row.lossPercentage"
              type="number"
              min="0"
              max="100"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { lossPercentage: Number($event) })"
            />
          </BaseTableCell>
          <!-- Remove -->
          <BaseTableCell align="end" class="align-top">
            <BaseButton
              size="sm"
              variant="danger"
              icon-only
              aria-label="Hapus baris"
              title="Hapus baris"
              :disabled="disabled"
              @click="removeRow(index)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </BaseTableCell>
        </BaseTableRow>

        <BaseTableRow v-if="modelValue.length === 0">
          <BaseTableCell colspan="5" align="center">
            Belum ada bahan. Tambahkan baris lalu ketik untuk mencari bahan.
          </BaseTableCell>
        </BaseTableRow>
      </template>
    </BaseTable>

    <!-- Add row -->
    <div v-if="!disabled" class="flex items-center gap-2">
      <BaseButton size="sm" variant="outline" @click="addRow">
        <template #start-icon><PlusIcon class="h-4 w-4" aria-hidden="true" /></template>
        Tambah Bahan
      </BaseButton>
    </div>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Setiap baris adalah satu bahan baku untuk satu batch resep. "Loss %" adalah kelonggaran susut
      bahan (0–100), default 0. Bahan yang sudah dipakai di baris lain tidak bisa dipilih lagi.
    </p>
  </div>
</template>
