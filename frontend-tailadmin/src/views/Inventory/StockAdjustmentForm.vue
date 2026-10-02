<script setup lang="ts">
/**
 * StockAdjustmentForm — full-page create/edit form for a Stock Adjustment.
 * A page (not a modal) because line items need room (document-page standard).
 *
 * CREATE (route `InventoryStockAdjustmentCreate`): empty header. The user picks
 *   an outlet; the batch picker in the items editor then loads that outlet's
 *   existing batches (once, via `getBatches({ outletId })`). Each item targets
 *   an existing batch; picking a batch auto-fills the row's productId.
 * EDIT (route `InventoryStockAdjustmentEdit`, :id): loads the adjustment.
 *   Editing is only allowed for DRAFT; any other status renders read-only with
 *   save hidden. Changing the outlet is locked while rows exist (the chosen
 *   batches belong to the current outlet).
 *
 * Validation (mirrors the backend): outlet + date required; at least one item;
 * each item needs a batch (which supplies productId), a positive qty, a reason,
 * and — for reason OTHER — a reasonDescription. An OUT qty exceeding current
 * available stock is only warned (the backend enforces it authoritatively on
 * completion). On success → detail page.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  StockAdjustmentHeaderFields,
  StockAdjustmentItemsEditor,
  type EditorItemRow,
} from '@/components/inventory/stock-adjustment'
import { toISODate } from '@/lib/format'
import { toMessage } from '@/composables/useStockLedger'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { inventoryService, type BatchWithExpiry } from '@/services/inventory.service'
import {
  stockAdjustmentService,
  type SaveStockAdjustmentPayload,
  type StockAdjustmentStatus,
} from '@/services/stock-adjustment.service'

const route = useRoute()
const router = useRouter()

const editId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id.length > 0 ? id : null
})
const isEdit = computed<boolean>(() => editId.value !== null)
const pageTitle = computed<string>(() =>
  isEdit.value ? 'Edit Stock Adjustment' : 'Buat Stock Adjustment',
)

// ── Supporting data ──────────────────────────────────────────────────
const outlets = ref<Outlet[]>([])
const products = ref<Product[]>([])
const batches = ref<BatchWithExpiry[]>([])
const batchesLoading = ref<boolean>(false)

// ── Form state ───────────────────────────────────────────────────────
const outletId = ref<string>('')
const adjustmentDate = ref<string>(toISODate(new Date()))
const notes = ref<string>('')
const items = ref<EditorItemRow[]>([])

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const loadedStatus = ref<StockAdjustmentStatus | null>(null)

const isReadOnly = computed<boolean>(
  () => isEdit.value && loadedStatus.value !== null && loadedStatus.value !== 'DRAFT',
)

// Lock the outlet select once rows exist (changing it invalidates batches).
const outletLocked = computed<boolean>(() => items.value.length > 0)

// Guard so the outlet watcher does not wipe loaded items on edit load.
let suppressOutletReset = false

const productMap = computed<Map<string, Product>>(
  () => new Map(products.value.map((p) => [p.id, p])),
)

function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  return product ? `${product.name} (${product.sku})` : productId
}

/** Load the existing batches of one outlet (once per outlet selection). */
async function loadBatchesForOutlet(targetOutletId: string): Promise<void> {
  if (!targetOutletId) {
    batches.value = []
    return
  }
  batchesLoading.value = true
  try {
    const result = await inventoryService.getBatches({
      page: 1,
      limit: 200,
      outletId: targetOutletId,
    })
    batches.value = result.items
  } catch (error) {
    formError.value = toMessage(error)
    batches.value = []
  } finally {
    batchesLoading.value = false
  }
}

async function loadSupportingData(): Promise<void> {
  const [outletResult, productResult] = await Promise.all([
    outletService.list({ page: 1, limit: 100 }),
    productService.list({ page: 1, limit: 200 }),
  ])
  outlets.value = outletResult.items
  products.value = productResult.items
}

async function loadExisting(id: string): Promise<void> {
  const adjustment = await stockAdjustmentService.getById(id)
  loadedStatus.value = adjustment.status
  // Don't let the outlet watcher clear items when we set the loaded outlet.
  suppressOutletReset = true
  outletId.value = adjustment.outletId
  adjustmentDate.value = adjustment.adjustmentDate
    ? adjustment.adjustmentDate.slice(0, 10)
    : toISODate(new Date())
  notes.value = adjustment.notes ?? ''
  items.value = adjustment.items.map((item) => ({
    batchId: item.batchId,
    productId: item.productId,
    direction: item.direction,
    qty: item.qty,
    reason: item.reason,
    reasonDescription: item.reasonDescription ?? '',
  }))
  // Load the batches of the loaded outlet so the picker renders their labels.
  await loadBatchesForOutlet(adjustment.outletId)
}

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    await loadSupportingData()
    if (editId.value) {
      await loadExisting(editId.value)
    }
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    loading.value = false
  }
})

// When the outlet changes, reload its batches and clear item rows (their
// batches belonged to the previous outlet). Skipped on edit load.
watch(outletId, async (next) => {
  if (suppressOutletReset) {
    suppressOutletReset = false
    return
  }
  items.value = []
  await loadBatchesForOutlet(next)
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!outletId.value) {
    return 'Outlet wajib dipilih.'
  }
  if (!adjustmentDate.value) {
    return 'Tanggal penyesuaian wajib diisi.'
  }
  if (items.value.length === 0) {
    return 'Minimal satu item penyesuaian harus ditambahkan.'
  }
  const seenBatches = new Set<string>()
  for (let i = 0; i < items.value.length; i += 1) {
    const item = items.value[i]
    const position = `Baris ${i + 1}`
    if (!item.batchId) {
      return `${position}: batch wajib dipilih.`
    }
    if (!item.productId) {
      return `${position}: produk tidak terisi dari batch. Pilih ulang batch.`
    }
    if (seenBatches.has(item.batchId)) {
      return `${position}: batch ${productLabel(item.productId)} tidak boleh muncul lebih dari satu kali.`
    }
    seenBatches.add(item.batchId)
    const qty = Number(item.qty) || 0
    if (qty <= 0) {
      return `${position}: qty harus lebih dari 0.`
    }
    if (item.direction !== 'IN' && item.direction !== 'OUT') {
      return `${position}: arah penyesuaian tidak valid.`
    }
    if (item.reason === 'OTHER' && !item.reasonDescription.trim()) {
      return `${position}: keterangan wajib diisi untuk alasan "Lainnya".`
    }
  }
  return null
}

async function onSubmit(): Promise<void> {
  if (isReadOnly.value) {
    return
  }
  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    return
  }
  formError.value = null
  submitting.value = true
  try {
    const mappedItems = items.value.map((item) => ({
      batchId: item.batchId,
      productId: item.productId,
      direction: item.direction,
      qty: Number(item.qty) || 0,
      reason: item.reason,
      reasonDescription: item.reasonDescription.trim() || undefined,
    }))
    const payload: SaveStockAdjustmentPayload = {
      outletId: outletId.value,
      adjustmentDate: adjustmentDate.value,
      notes: notes.value.trim() || undefined,
      items: mappedItems,
    }
    const saved = editId.value
      ? await stockAdjustmentService.update(editId.value, payload)
      : await stockAdjustmentService.create(payload)
    void router.push({ name: 'InventoryStockAdjustmentDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'InventoryStockAdjustments' })
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <!-- Page header: back (icon-only) + title on the start -->
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-label="Kembali ke Daftar"
        title="Kembali ke Daftar"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        @click="onCancel"
      >
        <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
      </button>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ pageTitle }}
      </h3>
    </div>

    <ComponentCard :title="pageTitle">
      <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Memuat data...
      </div>

      <div
        v-else-if="loadError"
        class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        role="alert"
      >
        {{ loadError }}
      </div>

      <form v-else class="space-y-6" @submit.prevent="onSubmit">
        <p
          v-if="isReadOnly"
          class="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        >
          Penyesuaian ini tidak dapat diedit pada status saat ini. Ditampilkan sebagai baca-saja.
        </p>

        <!-- Header -->
        <StockAdjustmentHeaderFields
          v-model:outlet-id="outletId"
          v-model:adjustment-date="adjustmentDate"
          v-model:notes="notes"
          :outlets="outlets"
          :disabled="isReadOnly"
          :outlet-locked="outletLocked"
        />

        <!-- Line items -->
        <div>
          <h5 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Item</h5>
          <StockAdjustmentItemsEditor
            v-model="items"
            :batches="batches"
            :products="products"
            :outlet-chosen="Boolean(outletId)"
            :batches-loading="batchesLoading"
            :disabled="isReadOnly"
          />
        </div>

        <p
          v-if="formError"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ formError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <Button size="sm" variant="outline" :disabled="submitting" :on-click="onCancel">
            {{ isReadOnly ? 'Kembali' : 'Batal' }}
          </Button>
          <button
            v-if="!isReadOnly"
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan sebagai Draft' }}
          </button>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
