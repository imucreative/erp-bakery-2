<script setup lang="ts">
/**
 * StockOpnameItemsTable — line-items table for a Stock Opname detail view.
 * Columns: Produk, Batch, System Qty, Counted Qty, Selisih (badge coloured by
 * sign). Pure presentation: resolves product/batch ids → names via injected
 * resolver callbacks.
 *
 * INLINE COUNT (COUNTING only): when `editable` is true, each row renders a
 * "Qty Fisik" number input plus an icon-only save button that emits
 * `record-count` { itemId, countedQty }. Local draft values are kept per row so
 * the input stays controlled; the parent runs the mutation and replaces the
 * opname from the response. Outside COUNTING the counted/difference columns are
 * read-only. `savingItemId` disables the row being saved.
 */
import { reactive } from 'vue'
import { Save } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { formatNumber } from '@/lib/format'
import {
  differenceBadgeColor,
  type StockOpname,
  type StockOpnameItem,
} from '@/services/stock-opname.service'

const props = defineProps<{
  opname: StockOpname
  productName: (id: string) => string
  batchLabel: (id: string) => string
  editable: boolean
  savingItemId: string | null
}>()

const emit = defineEmits<{
  (e: 'record-count', payload: { itemId: string; countedQty: number }): void
}>()

// Per-row draft entry for the "Qty Fisik" input, keyed by item id. Initialized
// lazily from the item's current countedQty when first edited.
const drafts = reactive<Record<string, string>>({})

function draftValue(item: StockOpnameItem): string {
  if (item.id in drafts) {
    return drafts[item.id]
  }
  return item.countedQty !== null ? String(item.countedQty) : ''
}

function onDraftInput(itemId: string, value: string): void {
  drafts[itemId] = value
}

/** Parse the current draft; returns null when blank or invalid/negative. */
function parsedCount(item: StockOpnameItem): number | null {
  const raw = draftValue(item).trim()
  if (raw === '') {
    return null
  }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return null
  }
  return value
}

function onSave(item: StockOpnameItem): void {
  const countedQty = parsedCount(item)
  if (countedQty === null) {
    return
  }
  emit('record-count', { itemId: item.id, countedQty })
}

const inputClass =
  'h-9 w-28 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Produk
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Batch
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            System Qty
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Counted Qty
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Selisih
          </th>
          <th
            v-if="props.editable"
            class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
          >
            Aksi
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-if="props.opname.items.length === 0"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td
            :colspan="props.editable ? 6 : 5"
            class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
          >
            Belum ada item. Mulai penghitungan untuk menyalin stok outlet.
          </td>
        </tr>
        <tr
          v-for="item in props.opname.items"
          :key="item.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ props.productName(item.productId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ props.batchLabel(item.batchId) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatNumber(item.systemQty) }}
          </td>
          <td class="px-4 py-3 text-end">
            <!-- Inline count input while COUNTING -->
            <div v-if="props.editable" class="flex justify-end">
              <input
                :value="draftValue(item)"
                type="number"
                min="0"
                step="any"
                inputmode="decimal"
                placeholder="Qty Fisik"
                :disabled="props.savingItemId === item.id"
                :class="inputClass"
                aria-label="Qty Fisik"
                @input="onDraftInput(item.id, ($event.target as HTMLInputElement).value)"
              />
            </div>
            <span v-else class="text-theme-sm text-gray-800 dark:text-white/90">
              {{ item.countedQty !== null ? formatNumber(item.countedQty) : '-' }}
            </span>
          </td>
          <td class="px-4 py-3 text-end">
            <Badge
              v-if="item.differenceQty !== null"
              :color="differenceBadgeColor(item.differenceQty)"
            >
              {{ item.differenceQty > 0 ? '+' : '' }}{{ formatNumber(item.differenceQty) }}
            </Badge>
            <span v-else class="text-theme-sm text-gray-400 dark:text-gray-500">-</span>
          </td>
          <td v-if="props.editable" class="px-4 py-3">
            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                aria-label="Simpan qty fisik"
                title="Simpan qty fisik"
                :disabled="props.savingItemId === item.id || parsedCount(item) === null"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                @click="onSave(item)"
              >
                <Save class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
