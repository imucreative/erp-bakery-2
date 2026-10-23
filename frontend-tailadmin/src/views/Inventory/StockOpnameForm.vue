<script setup lang="ts">
/**
 * StockOpnameForm — full-page CREATE form for a Stock Opname. Header only
 * (outlet + opname date + notes); there is NO item editor and NO edit mode —
 * an opname has no header update, and its items are snapshotted by the backend
 * on `start`. On success the user is redirected to the detail page where the
 * lifecycle (start → count → submit → approve → complete) is driven.
 *
 * Validation mirrors the backend: outlet + date required. On failure the user
 * stays on the page with the backend message surfaced.
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Save } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton } from '@/components/ui'
import { StockOpnameHeaderFields } from '@/components/inventory/stock-opname'
import { toISODate } from '@/lib/format'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { toMessage } from '@/composables/useStockLedger'
import { outletService, type Outlet } from '@/services/outlet.service'
import { stockOpnameService, type CreateStockOpnamePayload } from '@/services/stock-opname.service'

const router = useRouter()
const pageTitle = 'Buat Stock Opname'

// ── Supporting data ──────────────────────────────────────────────────
const outlets = ref<Outlet[]>([])

// ── Form state ───────────────────────────────────────────────────────
const outletId = ref<string>('')
const opnameDate = ref<string>(toISODate(new Date()))
const notes = ref<string>('')

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    outlets.value = await fetchAllPaginated((page) =>
      outletService.list({ page, limit: PAGE_LIMIT }),
    )
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    loading.value = false
  }
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!outletId.value) {
    return 'Outlet wajib dipilih.'
  }
  if (!opnameDate.value) {
    return 'Tanggal opname wajib diisi.'
  }
  return null
}

async function onSubmit(): Promise<void> {
  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    return
  }
  formError.value = null
  submitting.value = true
  try {
    const payload: CreateStockOpnamePayload = {
      outletId: outletId.value,
      opnameDate: opnameDate.value,
      notes: notes.value.trim() || undefined,
    }
    const saved = await stockOpnameService.create(payload)
    void router.push({ name: 'InventoryStockOpnameDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'InventoryStockOpnames' })
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
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
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
        <!-- Header -->
        <StockOpnameHeaderFields
          v-model:outlet-id="outletId"
          v-model:opname-date="opnameDate"
          v-model:notes="notes"
          :outlets="outlets"
          :disabled="submitting"
        />

        <p v-if="formError" class="alert-error px-3 py-2">
          {{ formError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton size="sm" variant="outline" :disabled="submitting" @click="onCancel">
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :loading="submitting"
            loading-text="Menyimpan..."
          >
            <template #start-icon><Save class="h-4 w-4" aria-hidden="true" /></template>
            Simpan sebagai Draft
          </BaseButton>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
