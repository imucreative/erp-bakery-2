<script setup lang="ts">
/**
 * UomDimensionList — master-data page for global UOM dimensions.
 *
 * A dimension always starts from its canonical (smallest) unit: creating a
 * dimension creates that factor-1 UOM in one flow, so other units can only be
 * added afterwards. Code and canonical unit are locked once stored because all
 * conversion factors reference them.
 */
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput } from '@/components/ui'
import UomDimensionTable from '@/components/masterdata/uom-dimension/UomDimensionTable.vue'
import UomDimensionFormModal from '@/components/masterdata/uom-dimension/UomDimensionFormModal.vue'
import UomDimensionDeleteModal from '@/components/masterdata/uom-dimension/UomDimensionDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useUomDimensions } from '@/composables/useUomDimensions'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

const pageTitle = 'Dimensi UOM'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('uom.manage'))

const {
  filteredItems,
  loading,
  errorMessage,
  search,
  fetchList,
  createDimension,
  updateDimension,
  deleteDimension,
  toMessage,
} = useUomDimensions()

interface FormPayload {
  code?: string
  name: string
  canonicalUnitName: string
  canonicalUnitSymbol: string
  isActive: boolean
}

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<UomDimensionDefinition | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(dimension: UomDimensionDefinition): void {
  formMode.value = 'edit'
  editing.value = dimension
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: FormPayload): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      await updateDimension(editing.value.code, {
        name: payload.name,
        isActive: payload.isActive,
      })
    } else {
      await createDimension({
        code: payload.code ?? '',
        name: payload.name,
        canonicalUnitName: payload.canonicalUnitName,
        canonicalUnitSymbol: payload.canonicalUnitSymbol,
        isActive: payload.isActive,
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
const deleteTarget = ref<UomDimensionDefinition | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(dimension: UomDimensionDefinition): void {
  deleteTarget.value = dimension
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
    await deleteDimension(deleteTarget.value.code)
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
      title="Dimensi UOM"
      desc="Setiap dimensi dimulai dari satuan terkecil (kanonik). Menambah dimensi sekaligus membuat UOM kanonik faktor 1, lalu satuan lain dibuat di menu Units of Measure."
    >
      <div class="panel-card mb-3">
        <p class="text-strong">Urutan yang benar</p>
        <ol class="text-meta mt-1 list-decimal space-y-1 pl-5">
          <li>Tentukan dimensi dan satuan terkecilnya di halaman ini (mis. LENGTH → milimeter).</li>
          <li>
            Tambahkan satuan lain di
            <RouterLink class="text-brand-500 hover:underline" to="/master/uoms">
              Units of Measure
            </RouterLink>
            dengan faktor ≥ 1 (mis. CM = 10, M = 1000, KM = 1000000).
          </li>
          <li>
            Atur ulang faktor bila perlu di
            <RouterLink class="text-brand-500 hover:underline" to="/master/uom-conversions">
              Konversi UOM
            </RouterLink>
            .
          </li>
        </ol>
      </div>

      <div class="toolbar-row">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput
            id="uom-dimension-search"
            v-model="search"
            placeholder="Cari kode, nama, atau satuan..."
          />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah Dimensi
        </BaseButton>
      </div>

      <UomDimensionTable
        :items="filteredItems"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        @edit="openEdit"
        @delete="openDelete"
      />
    </ComponentCard>

    <UomDimensionFormModal
      :open="formOpen"
      :mode="formMode"
      :dimension="editing"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <UomDimensionDeleteModal
      :open="deleteOpen"
      :dimension="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
