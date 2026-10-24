<script setup lang="ts">
/**
 * StockTransferForm — full-page create/edit form for a Stock Transfer.
 * A page (not a modal) because line items need room (document-page standard).
 *
 * CREATE (route `InventoryStockTransferCreate`): empty header. The user picks a
 *   source outlet; the batch picker in the items editor then loads that outlet's
 *   existing batches (once, via `getBatches({ outletId })`). Each item targets
 *   an existing source batch; picking a batch auto-fills the row's productId.
 *   The destination outlet must differ from the source.
 * EDIT (route `InventoryStockTransferEdit`, :id): loads the transfer.
 *   Editing is only allowed for DRAFT; any other status renders read-only with
 *   save hidden. Changing the source outlet is locked while rows exist (the
 *   chosen batches belong to the current source outlet).
 *
 * Validation (mirrors the backend): source + destination (≠ source) + date
 * required; at least one item; each item needs a source batch (which supplies
 * productId) and a positive qty. A qty exceeding current available stock is only
 * warned (the backend enforces it authoritatively on dispatch). On success →
 * detail page.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseAlert, BaseButton } from '@/components/ui'
import {
  StockTransferHeaderFields,
  StockTransferItemsEditor,
  type EditorItemRow,
} from '@/components/inventory/stock-transfer'
import { toISODate } from '@/lib/format'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { toMessage } from '@/composables/useStockLedger'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { inventoryService, type BatchWithExpiry } from '@/services/inventory.service'
import {
  stockTransferService,
  type SaveStockTransferPayload,
  type TransferStatus,
} from '@/services/stock-transfer.service'

const route = useRoute()
const router = useRouter()

const editId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id.length > 0 ? id : null
})
const isEdit = computed<boolean>(() => editId.value !== null)
const pageTitle = computed<string>(() =>
  isEdit.value ? 'Edit Transfer Stok' : 'Buat Transfer Stok',
)

// ── Supporting data ──────────────────────────────────────────────────
const outlets = ref<Outlet[]>([])
const products = ref<Product[]>([])
const batches = ref<BatchWithExpiry[]>([])
const batchesLoading = ref<boolean>(false)

// ── Form state ───────────────────────────────────────────────────────
const sourceOutletId = ref<string>('')
const destinationOutletId = ref<string>('')
const transferDate = ref<string>(toISODate(new Date()))
const notes = ref<string>('')
const items = ref<EditorItemRow[]>([])

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const loadedStatus = ref<TransferStatus | null>(null)

const isReadOnly = computed<boolean>(
  () => isEdit.value && loadedStatus.value !== null && loadedStatus.value !== 'DRAFT',
)

// Lock the source outlet select once rows exist (changing it invalidates batches).
const sourceLocked = computed<boolean>(() => items.value.length > 0)

// Guard so the source watcher does not wipe loaded items on edit load.
let suppressSourceReset = false

const productMap = computed<Map<string, Product>>(
  () => new Map(products.value.map((p) => [p.id, p])),
)

function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  return product ? `${product.name} (${product.sku})` : productId
}

/** Load the existing batches of one outlet (once per source selection). */
async function loadBatchesForOutlet(targetOutletId: string): Promise<void> {
  if (!targetOutletId) {
    batches.value = []
    return
  }
  batchesLoading.value = true
  try {
    batches.value = await fetchAllPaginated((page) =>
      inventoryService.getBatches({
        page,
        limit: PAGE_LIMIT,
        outletId: targetOutletId,
      }),
    )
  } catch (error) {
    formError.value = toMessage(error)
    batches.value = []
  } finally {
    batchesLoading.value = false
  }
}

async function loadSupportingData(): Promise<void> {
  const [allOutlets, allProducts] = await Promise.all([
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => productService.list({ page, limit: PAGE_LIMIT })),
  ])
  outlets.value = allOutlets
  products.value = allProducts
}

async function loadExisting(id: string): Promise<void> {
  const transfer = await stockTransferService.getById(id)
  loadedStatus.value = transfer.status
  // Don't let the source watcher clear items when we set the loaded outlet.
  suppressSourceReset = true
  sourceOutletId.value = transfer.sourceOutletId
  destinationOutletId.value = transfer.destinationOutletId
  transferDate.value = transfer.transferDate
    ? transfer.transferDate.slice(0, 10)
    : toISODate(new Date())
  notes.value = transfer.notes ?? ''
  items.value = transfer.items.map((item) => ({
    sourceBatchId: item.sourceBatchId,
    productId: item.productId,
    qty: item.qty,
  }))
  // Load the batches of the loaded source outlet so the picker renders labels.
  await loadBatchesForOutlet(transfer.sourceOutletId)
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

// When the source outlet changes, reload its batches and clear item rows (their
// batches belonged to the previous outlet). Skipped on edit load. If the new
// source equals the current destination, clear the destination too.
watch(sourceOutletId, async (next) => {
  if (suppressSourceReset) {
    suppressSourceReset = false
    return
  }
  items.value = []
  if (next && next === destinationOutletId.value) {
    destinationOutletId.value = ''
  }
  await loadBatchesForOutlet(next)
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!sourceOutletId.value) {
    return 'Outlet sumber wajib dipilih.'
  }
  if (!destinationOutletId.value) {
    return 'Outlet tujuan wajib dipilih.'
  }
  if (sourceOutletId.value === destinationOutletId.value) {
    return 'Outlet tujuan harus berbeda dari outlet sumber.'
  }
  if (!transferDate.value) {
    return 'Tanggal transfer wajib diisi.'
  }
  if (items.value.length === 0) {
    return 'Minimal satu item transfer harus ditambahkan.'
  }
  const seenBatches = new Set<string>()
  for (let i = 0; i < items.value.length; i += 1) {
    const item = items.value[i]
    const position = `Baris ${i + 1}`
    if (!item.sourceBatchId) {
      return `${position}: batch sumber wajib dipilih.`
    }
    if (!item.productId) {
      return `${position}: produk tidak terisi dari batch. Pilih ulang batch.`
    }
    if (seenBatches.has(item.sourceBatchId)) {
      return `${position}: batch ${productLabel(item.productId)} tidak boleh muncul lebih dari satu kali.`
    }
    seenBatches.add(item.sourceBatchId)
    const qty = Number(item.qty) || 0
    if (qty <= 0) {
      return `${position}: qty harus lebih dari 0.`
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
      sourceBatchId: item.sourceBatchId,
      productId: item.productId,
      qty: Number(item.qty) || 0,
    }))
    const payload: SaveStockTransferPayload = {
      sourceOutletId: sourceOutletId.value,
      destinationOutletId: destinationOutletId.value,
      transferDate: transferDate.value,
      notes: notes.value.trim() || undefined,
      items: mappedItems,
    }
    const saved = editId.value
      ? await stockTransferService.update(editId.value, payload)
      : await stockTransferService.create(payload)
    void router.push({ name: 'InventoryStockTransferDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'InventoryStockTransfers' })
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <!-- Page header: back (icon-only) + title on the start -->
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <BaseButton
        variant="outline"
        icon-only
        aria-label="Kembali ke Daftar"
        title="Kembali ke Daftar"
        class="h-10 w-10"
        @click="onCancel"
      >
        <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
      </BaseButton>
      <h3 class="card-title">
        {{ pageTitle }}
      </h3>
    </div>

    <ComponentCard :title="pageTitle">
      <div v-if="loading" class="text-muted py-10 text-center">Memuat data...</div>

      <BaseAlert v-else-if="loadError" :message="loadError" size="md" />

      <form v-else class="space-y-6" @submit.prevent="onSubmit">
        <BaseAlert v-if="isReadOnly" variant="warning" size="md" class="dark:text-orange-400">
          Transfer ini tidak dapat diedit pada status saat ini. Ditampilkan sebagai baca-saja.
        </BaseAlert>

        <!-- Header -->
        <StockTransferHeaderFields
          v-model:source-outlet-id="sourceOutletId"
          v-model:destination-outlet-id="destinationOutletId"
          v-model:transfer-date="transferDate"
          v-model:notes="notes"
          :outlets="outlets"
          :disabled="isReadOnly"
          :source-locked="sourceLocked"
        />

        <!-- Line items -->
        <div>
          <h5 class="mb-3 section-title">Item</h5>
          <StockTransferItemsEditor
            v-model="items"
            :batches="batches"
            :products="products"
            :source-chosen="Boolean(sourceOutletId)"
            :batches-loading="batchesLoading"
            :disabled="isReadOnly"
          />
        </div>

        <BaseAlert v-if="formError" :message="formError" size="sm" />

        <div class="button-row pt-2">
          <BaseButton size="sm" variant="outline" :disabled="submitting" @click="onCancel">
            {{ isReadOnly ? 'Kembali' : 'Batal' }}
          </BaseButton>
          <BaseButton
            v-if="!isReadOnly"
            type="submit"
            variant="primary"
            :loading="submitting"
            loading-text="Menyimpan..."
          >
            Simpan sebagai Draft
          </BaseButton>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
