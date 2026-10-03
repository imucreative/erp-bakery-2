<script setup lang="ts">
/**
 * PaymentTermList — thin controller/composition for the Payment Terms page.
 * List state + CRUD live in `usePaymentTerms`; table and modals are separate
 * components. This view wires them and owns modal open/mode state.
 */
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import PaymentTermTable from '@/components/masterdata/payment-term/PaymentTermTable.vue'
import PaymentTermFormModal from '@/components/masterdata/payment-term/PaymentTermFormModal.vue'
import PaymentTermDeleteModal from '@/components/masterdata/payment-term/PaymentTermDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { usePaymentTerms } from '@/composables/usePaymentTerms'
import type { PaymentTerm } from '@/services/payment-term.service'

const pageTitle = 'Payment Terms'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('payment-term.manage'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  activeFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  toMessage,
} = usePaymentTerms()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<PaymentTerm | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(paymentTerm: PaymentTerm): void {
  formMode.value = 'edit'
  editing.value = paymentTerm
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: {
  code: string
  name: string
  dueDays: number
  isActive: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      await updatePaymentTerm(editing.value.id, {
        name: payload.name,
        dueDays: payload.dueDays,
        isActive: payload.isActive,
      })
    } else {
      await createPaymentTerm({
        code: payload.code,
        name: payload.name,
        dueDays: payload.dueDays,
      })
    }
    formOpen.value = false
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────
const deleteOpen = ref<boolean>(false)
const deleteTarget = ref<PaymentTerm | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(paymentTerm: PaymentTerm): void {
  deleteTarget.value = paymentTerm
  deleteError.value = null
  deleteOpen.value = true
}

async function onConfirmDelete(): Promise<void> {
  if (!deleteTarget.value) {
    return
  }
  deleting.value = true
  deleteError.value = null
  try {
    await deletePaymentTerm(deleteTarget.value.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}

void fetchList()
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard title="Payment Terms" desc="Kelola termin pembayaran untuk supplier & transaksi.">
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative w-full sm:max-w-xs">
            <input
              v-model="search"
              type="text"
              placeholder="Cari payment term..."
              class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>
          <div class="relative w-full sm:w-55">
            <select
              v-model="activeFilter"
              class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
            <ChevronDownIcon
              class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
        <Button v-if="canManage" size="sm" variant="primary" :on-click="openCreate">
          + Tambah Payment Term
        </Button>
      </div>

      <PaymentTermTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        @edit="openEdit"
        @delete="openDelete"
      />

      <!-- Pagination -->
      <div
        v-if="!loading && !errorMessage && items.length > 0"
        class="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row"
      >
        <span class="text-theme-sm text-gray-500 dark:text-gray-400">
          Menampilkan {{ items.length }} dari {{ meta.total }} data
        </span>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" :disabled="!canPrev" :on-click="prevPage">
            Sebelumnya
          </Button>
          <span class="text-theme-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ totalPages }}
          </span>
          <Button size="sm" variant="outline" :disabled="!canNext" :on-click="nextPage">
            Berikutnya
          </Button>
        </div>
      </div>
    </ComponentCard>

    <PaymentTermFormModal
      :open="formOpen"
      :mode="formMode"
      :payment-term="editing"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <PaymentTermDeleteModal
      :open="deleteOpen"
      :payment-term="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
