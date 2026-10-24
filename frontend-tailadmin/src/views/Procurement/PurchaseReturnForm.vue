<script setup lang="ts">
/**
 * PurchaseReturnForm — full-page create/edit form for a Purchase Return.
 * A page (not a modal) because line items need room (document-page standard).
 *
 * CREATE (route `PurchaseReturnCreate`): empty header. The user picks a
 *   COMPLETED source Goods Receipt. On GR selection the supplier + outlet are
 *   inherited (read-only) from the GR, and the editor's rows are built from the
 *   GR's returnable lines (`getReturnable(goodsReceiptId)`): one row per line,
 *   included:false, returnQuantity:0, empty reason. A row with
 *   `returnableQuantity <= 0` has nothing left to return.
 * EDIT (route `PurchaseReturnEdit`, :id): loads the PR. Editing is only allowed
 *   for DRAFT; any other status renders read-only with save hidden. The source
 *   GR is locked. The returnable set is re-fetched; rows already present in the
 *   PR are marked included with their own quantity/reason prefilled, and their
 *   per-row cap gets the PR item's own quantity added back so editing keeps it
 *   available.
 *
 * The item snapshot fields come straight from the returnable line and are
 * carried verbatim into the payload. Validation mirrors the backend: GR
 * required, ≥1 included row, each included row needs returnQuantity in
 * (0, returnableQuantity], a reason, and a description when reason === 'OTHER'.
 * On success → detail page.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton } from '@/components/ui'
import {
  PurchaseReturnHeaderFields,
  PurchaseReturnItemsEditor,
  type EditorReturnRow,
} from '@/components/procurement/purchase-return'
import { toISODate } from '@/lib/format'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { toMessage } from '@/composables/usePurchaseRequests'
import { outletService } from '@/services/outlet.service'
import { supplierService } from '@/services/supplier.service'
import { goodsReceiptService, type GoodsReceipt } from '@/services/goods-receipt.service'
import {
  purchaseReturnService,
  type PurchaseReturn,
  type PurchaseReturnReason,
  type ReturnableLine,
  type PurchaseReturnItemPayload,
  type SavePurchaseReturnPayload,
} from '@/services/purchase-return.service'

const route = useRoute()
const router = useRouter()

const editId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id.length > 0 ? id : null
})
const isEdit = computed<boolean>(() => editId.value !== null)
const pageTitle = computed<string>(() =>
  isEdit.value ? 'Edit Purchase Return' : 'Buat Purchase Return',
)

// ── Supporting data ──────────────────────────────────────────────────
const completedReceipts = ref<GoodsReceipt[]>([])
const supplierNames = ref<Map<string, string>>(new Map())
const outletNames = ref<Map<string, string>>(new Map())

// ── Form state ───────────────────────────────────────────────────────
const goodsReceiptId = ref<string>('')
const returnDate = ref<string>(toISODate(new Date()))
const notes = ref<string>('')
const items = ref<EditorReturnRow[]>([])
const supplierId = ref<string>('')
const outletId = ref<string>('')
// True once a GR is chosen but every returnable line has no remaining quantity.
const allReturned = ref<boolean>(false)

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const loadedStatus = ref<PurchaseReturn['status'] | null>(null)

const isReadOnly = computed<boolean>(
  () => isEdit.value && loadedStatus.value !== null && loadedStatus.value !== 'DRAFT',
)

// Guard so auto-applied prefill never clobbers user intent on edit load.
let suppressGrPrefill = false

const grNumberMap = computed<Map<string, string>>(
  () => new Map(completedReceipts.value.map((gr) => [gr.id, gr.grNumber])),
)

function grNumber(id: string): string {
  return grNumberMap.value.get(id) ?? id
}

const supplierLabel = computed<string>(() => {
  if (!supplierId.value) {
    return ''
  }
  return supplierNames.value.get(supplierId.value) ?? supplierId.value
})

const outletLabel = computed<string>(() => {
  if (!outletId.value) {
    return ''
  }
  return outletNames.value.get(outletId.value) ?? outletId.value
})

/** Human label for a row's product (name + SKU) for validation messages. */
function rowLabel(row: EditorReturnRow): string {
  return `${row.productName} (${row.productSku})`
}

/** Map a returnable line into a fresh editor row (included off by default). */
function toEditorRow(line: ReturnableLine, returnableQuantity: number): EditorReturnRow {
  return {
    goodsReceiptItemId: line.goodsReceiptItemId,
    sourceBatchId: line.sourceBatchId,
    sourceMovementId: line.sourceMovementId,
    productId: line.productId,
    productSku: line.productSku,
    productName: line.productName,
    uomId: line.uomId,
    uomCode: line.uomCode,
    uomName: line.uomName,
    batchNumber: line.batchNumber,
    lotNumber: line.lotNumber,
    expiredDate: line.expiredDate,
    postedAcceptedQuantity: line.postedAcceptedQuantity,
    previouslyReturnedQuantity: line.completedReturnQuantity + line.submittedReturnQuantity,
    returnableQuantity,
    included: false,
    returnQuantity: 0,
    reason: '',
    reasonDescription: '',
  }
}

async function loadSupportingData(): Promise<void> {
  const [allReceipts, allSuppliers, allOutlets] = await Promise.all([
    fetchAllPaginated((page) =>
      goodsReceiptService.list({ page, limit: PAGE_LIMIT, status: 'COMPLETED' }),
    ),
    fetchAllPaginated((page) => supplierService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
  ])
  completedReceipts.value = allReceipts
  supplierNames.value = new Map(allSuppliers.map((s) => [s.id, s.name]))
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
}

async function loadExisting(id: string): Promise<void> {
  const pr = await purchaseReturnService.getById(id)
  loadedStatus.value = pr.status
  // Ensure the source GR is present so its number renders in the locked select.
  if (!completedReceipts.value.some((gr) => gr.id === pr.goodsReceiptId)) {
    try {
      const sourceGr = await goodsReceiptService.getById(pr.goodsReceiptId)
      completedReceipts.value = [sourceGr, ...completedReceipts.value]
    } catch {
      // Non-fatal: the select may show the raw id via the grNumber fallback.
    }
  }
  // Don't let watchers overwrite the loaded values.
  suppressGrPrefill = true
  goodsReceiptId.value = pr.goodsReceiptId
  returnDate.value = pr.returnDate ? pr.returnDate.slice(0, 10) : toISODate(new Date())
  notes.value = pr.notes ?? ''
  supplierId.value = pr.supplierId
  outletId.value = pr.outletId

  // Prefill rows from the current returnable set; the PR's own items are marked
  // included with their quantity/reason, and their own quantity is added back
  // to the per-row cap so editing keeps it available. If getReturnable fails,
  // fall back to building rows directly from the PR items.
  const existingByItem = new Map(pr.items.map((item) => [item.goodsReceiptItemId, item]))
  try {
    const lines = await purchaseReturnService.getReturnable(pr.goodsReceiptId)
    items.value = lines.map((line) => {
      const existing = existingByItem.get(line.goodsReceiptItemId)
      const cap = existing
        ? line.returnableQuantity + existing.returnQuantity
        : line.returnableQuantity
      const row = toEditorRow(line, cap)
      if (existing) {
        row.included = true
        row.returnQuantity = existing.returnQuantity
        row.reason = existing.reason
        row.reasonDescription = existing.reasonDescription ?? ''
      }
      return row
    })
  } catch {
    items.value = pr.items.map((item) => ({
      goodsReceiptItemId: item.goodsReceiptItemId,
      sourceBatchId: item.sourceBatchId,
      sourceMovementId: item.sourceMovementId,
      productId: item.productId,
      productSku: item.productSku,
      productName: item.productName,
      uomId: item.uomId,
      uomCode: item.uomCode,
      uomName: item.uomName,
      batchNumber: item.batchNumber,
      lotNumber: item.lotNumber,
      expiredDate: item.expiredDate,
      postedAcceptedQuantity: item.postedAcceptedQuantity,
      previouslyReturnedQuantity: item.previouslyReturnedQuantity,
      returnableQuantity: item.returnQuantity,
      included: true,
      returnQuantity: item.returnQuantity,
      reason: item.reason,
      reasonDescription: item.reasonDescription ?? '',
    }))
  }
  allReturned.value = false
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

// ── Reactive prefill behavior (create mode) ──────────────────────────
// When the source GR changes, inherit its supplier + outlet (read-only) and
// build the editor rows from the GR returnable lines. Skipped on edit load.
watch(goodsReceiptId, async (grId) => {
  if (suppressGrPrefill) {
    suppressGrPrefill = false
    return
  }
  if (!grId) {
    supplierId.value = ''
    outletId.value = ''
    items.value = []
    allReturned.value = false
    return
  }
  // Supplier + outlet are inherited from the selected GR (read-only).
  const gr = completedReceipts.value.find((o) => o.id === grId)
  if (gr) {
    supplierId.value = gr.supplierId
    outletId.value = gr.destinationOutletId
  }
  try {
    const lines = await purchaseReturnService.getReturnable(grId)
    items.value = lines.map((line) => toEditorRow(line, line.returnableQuantity))
    allReturned.value = lines.every((line) => line.returnableQuantity <= 0)
  } catch (error) {
    formError.value = toMessage(error)
  }
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!goodsReceiptId.value) {
    return 'GR sumber wajib dipilih.'
  }
  const includedRows = items.value.filter((row) => row.included)
  if (includedRows.length === 0) {
    return 'Pilih minimal satu baris untuk diretur.'
  }
  for (const row of includedRows) {
    const label = rowLabel(row)
    const qty = Number(row.returnQuantity) || 0
    if (qty <= 0) {
      return `Item ${label}: Jumlah retur harus lebih dari 0.`
    }
    if (qty > row.returnableQuantity) {
      return `Item ${label}: Jumlah retur melebihi jumlah dapat diretur.`
    }
    if (!row.reason) {
      return `Item ${label}: Alasan retur wajib dipilih.`
    }
    if (row.reason === 'OTHER' && !row.reasonDescription.trim()) {
      return `Item ${label}: Keterangan wajib diisi untuk alasan Lainnya.`
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
    // Send ONLY the 4 fields the backend DTO accepts (forbidNonWhitelisted).
    // All snapshot fields on the editor row are display/validation-only and are
    // derived server-side — including them would trigger a 400.
    const mappedItems: PurchaseReturnItemPayload[] = items.value
      .filter((row) => row.included)
      .map((row) => {
        const description = row.reasonDescription.trim()
        return {
          goodsReceiptItemId: row.goodsReceiptItemId,
          returnQuantity: Number(row.returnQuantity) || 0,
          reason: row.reason as PurchaseReturnReason,
          reasonDescription: description || undefined,
        }
      })
    const payload: SavePurchaseReturnPayload = {
      goodsReceiptId: goodsReceiptId.value,
      returnDate: returnDate.value || undefined,
      notes: notes.value.trim() || undefined,
      items: mappedItems,
    }
    const saved = editId.value
      ? await purchaseReturnService.update(editId.value, payload)
      : await purchaseReturnService.create(payload)
    void router.push({ name: 'PurchaseReturnDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'PurchaseReturns' })
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

      <div v-else-if="loadError" class="alert-error px-4 py-3" role="alert">
        {{ loadError }}
      </div>

      <form v-else class="space-y-6" @submit.prevent="onSubmit">
        <p
          v-if="isReadOnly"
          class="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        >
          Retur ini tidak dapat diedit pada status saat ini. Ditampilkan sebagai baca-saja.
        </p>

        <!-- Header -->
        <PurchaseReturnHeaderFields
          v-model:goods-receipt-id="goodsReceiptId"
          v-model:return-date="returnDate"
          v-model:notes="notes"
          :completed-receipts="completedReceipts"
          :gr-number="grNumber"
          :supplier-label="supplierLabel"
          :outlet-label="outletLabel"
          :disabled="isReadOnly"
          :gr-locked="isEdit"
        />

        <!-- Line items -->
        <div>
          <h5 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Item</h5>
          <p
            v-if="allReturned"
            class="mb-3 rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
            role="alert"
          >
            Semua item GR ini sudah habis diretur. Tidak ada sisa yang dapat diretur, sehingga retur
            tidak dapat dibuat.
          </p>
          <PurchaseReturnItemsEditor v-model="items" :disabled="isReadOnly" />
        </div>

        <p v-if="formError" class="alert-error px-3 py-2">
          {{ formError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton size="sm" variant="outline" :disabled="submitting" @click="onCancel">
            {{ isReadOnly ? 'Kembali' : 'Batal' }}
          </BaseButton>
          <BaseButton
            v-if="!isReadOnly"
            type="submit"
            variant="primary"
            :disabled="submitting || allReturned"
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
