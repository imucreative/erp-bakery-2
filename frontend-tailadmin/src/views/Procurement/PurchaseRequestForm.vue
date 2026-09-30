<script setup lang="ts">
/**
 * PurchaseRequestForm — full-page create/edit form for a Purchase Request.
 * A page (not a modal) because line items need room (doc 34 §6 decision).
 *
 * CREATE (route `PurchaseRequestCreate`): empty header + one blank item row.
 * EDIT   (route `PurchaseRequestEdit`, :id): loads the PR. Editing is only
 *   allowed for DRAFT/REJECTED; any other status renders read-only with the
 *   save button hidden.
 *
 * Validation: destination outlet required, expectedDate must be tomorrow or
 * later, every item needs product+UOM+quantity>0+price>=0, min 1 item. The
 * payload omits subtotal/total (server computes). On success → detail page.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import {
  PurchaseRequestItemsEditor,
  type EditorItemRow,
} from '@/components/procurement/purchase-request'
import { tomorrowISO } from '@/lib/format'
import { toMessage } from '@/composables/usePurchaseRequests'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { uomService, type Uom } from '@/services/uom.service'
import {
  purchaseRequestService,
  type PurchaseRequest,
  type SavePurchaseRequestPayload,
} from '@/services/purchase-request.service'

const route = useRoute()
const router = useRouter()

const editId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id.length > 0 ? id : null
})
const isEdit = computed<boolean>(() => editId.value !== null)
const pageTitle = computed<string>(() => (isEdit.value ? 'Edit Purchase Request' : 'Buat Purchase Request'))

// ── Supporting data ──────────────────────────────────────────────────
const outlets = ref<Outlet[]>([])
const products = ref<Product[]>([])
const uoms = ref<Uom[]>([])

// ── Form state ───────────────────────────────────────────────────────
const destinationOutletId = ref<string>('')
const expectedDate = ref<string>(tomorrowISO())
const notes = ref<string>('')
const items = ref<EditorItemRow[]>([{ productId: '', quantity: 1, uomId: '', estimatedPrice: 0 }])
const minDate = tomorrowISO()

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const loadedStatus = ref<PurchaseRequest['status'] | null>(null)

// Edit is only permitted for DRAFT/REJECTED; otherwise show read-only.
const isReadOnly = computed<boolean>(
  () => isEdit.value && loadedStatus.value !== null && loadedStatus.value !== 'DRAFT' && loadedStatus.value !== 'REJECTED',
)

async function loadSupportingData(): Promise<void> {
  const [outletResult, productResult, uomResult] = await Promise.all([
    outletService.list({ page: 1, limit: 100, isActive: 'true' }),
    productService.list({ page: 1, limit: 200, isActive: 'true' }),
    uomService.list({ page: 1, limit: 200, isActive: 'true' }),
  ])
  outlets.value = outletResult.items
  products.value = productResult.items
  uoms.value = uomResult.items
}

async function loadExisting(id: string): Promise<void> {
  const pr = await purchaseRequestService.getById(id)
  loadedStatus.value = pr.status
  destinationOutletId.value = pr.destinationOutletId
  expectedDate.value = pr.expectedDate ? pr.expectedDate.slice(0, 10) : tomorrowISO()
  notes.value = pr.notes ?? ''
  items.value = pr.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    uomId: item.uomId,
    estimatedPrice: item.estimatedPrice,
  }))
  if (items.value.length === 0) {
    items.value = [{ productId: '', quantity: 1, uomId: '', estimatedPrice: 0 }]
  }
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

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!destinationOutletId.value) {
    return 'Outlet tujuan wajib dipilih.'
  }
  if (!expectedDate.value) {
    return 'Tanggal dibutuhkan wajib diisi.'
  }
  if (expectedDate.value < minDate) {
    return 'Tanggal dibutuhkan harus besok atau setelahnya.'
  }
  if (items.value.length === 0) {
    return 'Minimal satu item diperlukan.'
  }
  for (const [index, item] of items.value.entries()) {
    const row = index + 1
    if (!item.productId) {
      return `Item ${row}: produk wajib dipilih.`
    }
    if (!item.uomId) {
      return `Item ${row}: UOM wajib dipilih.`
    }
    if (!(Number(item.quantity) > 0)) {
      return `Item ${row}: kuantitas harus lebih dari 0.`
    }
    if (Number(item.estimatedPrice) < 0) {
      return `Item ${row}: estimasi harga tidak boleh negatif.`
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
    const payload: SavePurchaseRequestPayload = {
      destinationOutletId: destinationOutletId.value,
      expectedDate: expectedDate.value,
      notes: notes.value.trim() || undefined,
      items: items.value.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        uomId: item.uomId,
        estimatedPrice: Number(item.estimatedPrice),
      })),
    }
    const saved = editId.value
      ? await purchaseRequestService.update(editId.value, payload)
      : await purchaseRequestService.create(payload)
    void router.push({ name: 'PurchaseRequestDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'PurchaseRequests' })
}

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

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
          PR ini tidak dapat diedit pada status saat ini. Ditampilkan sebagai baca-saja.
        </p>

        <!-- Header -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Outlet Tujuan<span class="text-error-500">*</span></label>
            <div class="relative">
              <select
                v-model="destinationOutletId"
                :disabled="isReadOnly"
                :class="[inputClass, 'appearance-none pe-10']"
              >
                <option value="" disabled>Pilih outlet tujuan</option>
                <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label :class="labelClass">Tanggal Dibutuhkan<span class="text-error-500">*</span></label>
            <input
              v-model="expectedDate"
              type="date"
              :min="minDate"
              :disabled="isReadOnly"
              :class="inputClass"
            />
            <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Harus besok atau setelahnya.
            </p>
          </div>
        </div>

        <div>
          <label :class="labelClass">Catatan</label>
          <textarea
            v-model="notes"
            rows="2"
            :disabled="isReadOnly"
            placeholder="Catatan opsional untuk PR ini..."
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>

        <!-- Line items -->
        <div>
          <h5 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Item</h5>
          <PurchaseRequestItemsEditor
            v-model="items"
            :products="products"
            :uoms="uoms"
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
