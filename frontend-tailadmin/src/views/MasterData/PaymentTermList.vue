<script setup lang="ts">
/**
 * PaymentTermList — thin controller/composition for the Payment Terms page.
 * List state + CRUD live in `usePaymentTerms`; table and modals are separate
 * components. This view wires them and owns modal open/mode state.
 */
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput, BaseSelect } from '@/components/ui'
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

    <ComponentCard
      title="Payment Terms"
      desc="Kelola termin pembayaran untuk supplier & transaksi."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="w-full sm:max-w-xs">
            <BaseInput
              id="payment-term-search"
              v-model="search"
              placeholder="Cari payment term..."
            />
          </div>
          <div class="w-full sm:w-55">
            <BaseSelect
              id="payment-term-status"
              v-model="activeFilter"
              :options="[
                { label: 'Semua Status', value: 'all' },
                { label: 'Aktif', value: 'true' },
                { label: 'Nonaktif', value: 'false' },
              ]"
            />
          </div>
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah Payment Term
        </BaseButton>
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
          <BaseButton size="sm" variant="outline" :disabled="!canPrev" @click="prevPage">
            <template #start-icon>
              <ChevronLeft class="h-4 w-4" aria-hidden="true" />
            </template>
            Sebelumnya
          </BaseButton>
          <span class="text-theme-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ totalPages }}
          </span>
          <BaseButton size="sm" variant="outline" :disabled="!canNext" @click="nextPage">
            <template #end-icon>
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </template>
            Berikutnya
          </BaseButton>
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
