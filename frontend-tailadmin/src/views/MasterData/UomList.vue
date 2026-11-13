<script setup lang="ts">
/**
 * UomList — thin controller/composition for the Units of Measure page.
 * All list state + CRUD live in `useUoms`; table and modals are separate
 * components. This view only wires them together and owns modal open/mode state.
 *
 * Dimensions are reference data managed from this same page through
 * `UomDimensionManagerDrawer` (drill-down, no separate page), so a user sets up
 * the family + smallest unit and then adds units without leaving the screen.
 *
 * The former Konversi UOM page is merged here: the table exposes code, dimension,
 * factor, and the derived equivalence, plus a server-side dimension filter.
 */
import { computed, onMounted, ref } from 'vue'
import { Plus, Settings2 } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseTablePagination } from '@/components/ui'
import UomFilterBar from '@/components/masterdata/uom/UomFilterBar.vue'
import UomDimensionSummary from '@/components/masterdata/uom/UomDimensionSummary.vue'
import UomTable from '@/components/masterdata/uom/UomTable.vue'
import UomFormModal from '@/components/masterdata/uom/UomFormModal.vue'
import UomDeleteModal from '@/components/masterdata/uom/UomDeleteModal.vue'
import UomDimensionManagerDrawer from '@/components/masterdata/uom-dimension/UomDimensionManagerDrawer.vue'
import { usePermission } from '@/composables/usePermission'
import { useUoms } from '@/composables/useUoms'
import type { Uom } from '@/services/uom.service'
import { uomDimensionService, type UomDimensionDefinition } from '@/services/uom-dimension.service'

const pageTitle = 'Units of Measure'
const route = useRoute()
const router = useRouter()
const { can } = usePermission()
const canManage = computed<boolean>(() => can('uom.manage'))

const dimensions = ref<UomDimensionDefinition[]>([])

async function fetchDimensions(): Promise<void> {
  try {
    dimensions.value = await uomDimensionService.list({ includeInactive: true })
  } catch {
    dimensions.value = []
  }
}

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  dimension,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
  createUom,
  updateUom,
  deleteUom,
  toMessage,
} = useUoms()

const dimensionFilterOptions = computed(() => [
  { label: 'Semua dimensi', value: '' },
  ...dimensions.value.map((item) => ({
    label: item.isActive ? `${item.name} (${item.code})` : `${item.name} (${item.code}, nonaktif)`,
    value: item.code,
  })),
])

const emptyMessage = computed<string>(() =>
  dimension.value || search.value.trim()
    ? 'Tidak ada UOM yang cocok dengan filter.'
    : 'Belum ada satuan ukur.',
)

// ── Dimension manager drawer ─────────────────────────────────────────
const dimensionManagerOpen = ref<boolean>(false)
const dimensionManagerInitialMode = ref<'list' | 'create'>('list')
const presetDimensionCode = ref<string | null>(null)

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Uom | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openDimensionManager(mode: 'list' | 'create' = 'list'): void {
  dimensionManagerInitialMode.value = mode
  dimensionManagerOpen.value = true
}

async function onDimensionChanged(): Promise<void> {
  await fetchDimensions()
  await fetchList()
}

function onDimensionCreated(dimension: UomDimensionDefinition): void {
  if (formOpen.value && formMode.value === 'create') {
    presetDimensionCode.value = dimension.code
    dimensionManagerOpen.value = false
  }
}

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  presetDimensionCode.value = null
  formOpen.value = true
}

function openEdit(uom: Uom): void {
  formMode.value = 'edit'
  editing.value = uom
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: {
  code?: string
  name: string
  dimension: string
  factorToCanonical: number
  isActive: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    const code = payload.code ? { code: payload.code } : {}
    if (formMode.value === 'edit' && editing.value) {
      await updateUom(editing.value.id, {
        ...code,
        name: payload.name,
        dimension: payload.dimension,
        factorToCanonical: payload.factorToCanonical,
        isActive: payload.isActive,
      })
    } else {
      await createUom({
        ...code,
        name: payload.name,
        dimension: payload.dimension,
        factorToCanonical: payload.factorToCanonical,
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
const deleteTarget = ref<Uom | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(uom: Uom): void {
  deleteTarget.value = uom
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
    await deleteUom(deleteTarget.value.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  if (route.query.kelolaDimensi === '1' && canManage.value) {
    openDimensionManager('list')
    void router.replace({ query: { ...route.query, kelolaDimensi: undefined } })
  }
})

void fetchList()
void fetchDimensions()
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Units of Measure"
      desc="Kelola satuan ukur beserta dimensi dan faktor ke satuan kanonik. Konversi antar-satuan dihitung otomatis."
    >
      <!-- Toolbar -->
      <div class="toolbar-row sm:flex-wrap">
        <UomFilterBar
          v-model:search="search"
          v-model:dimension="dimension"
          :dimension-options="dimensionFilterOptions"
        />
        <div class="flex shrink-0 items-center gap-2 sm:ms-auto">
          <BaseButton
            v-if="canManage"
            size="sm"
            variant="outline"
            @click="openDimensionManager('list')"
          >
            <template #start-icon>
              <Settings2 class="h-4 w-4" aria-hidden="true" />
            </template>
            Kelola Dimensi
          </BaseButton>
          <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
            <template #start-icon>
              <Plus class="h-4 w-4" aria-hidden="true" />
            </template>
            Tambah UOM
          </BaseButton>
        </div>
      </div>

      <UomDimensionSummary
        :dimensions="dimensions"
        :can-manage="canManage"
        @create="openDimensionManager('create')"
      />

      <UomTable
        :items="items"
        :dimensions="dimensions"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        :empty-message="emptyMessage"
        @edit="openEdit"
        @delete="openDelete"
      />

      <!-- Pagination -->
      <BaseTablePagination
        v-if="!loading && !errorMessage && items.length > 0"
        :current-count="items.length"
        :total-items="meta.total"
        :current-page="page"
        :total-pages="totalPages"
        :has-previous="canPrev"
        :has-next="canNext"
        @previous="prevPage"
        @next="nextPage"
      />
    </ComponentCard>

    <UomFormModal
      :open="formOpen"
      :mode="formMode"
      :uom="editing"
      :dimensions="dimensions"
      :can-manage="canManage"
      :preset-dimension="presetDimensionCode"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @manage-dimensions="openDimensionManager('create')"
      @submit="onSubmitForm"
    />

    <UomDeleteModal
      :open="deleteOpen"
      :uom="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />

    <UomDimensionManagerDrawer
      :open="dimensionManagerOpen"
      :can-manage="canManage"
      :initial-mode="dimensionManagerInitialMode"
      @close="dimensionManagerOpen = false"
      @changed="onDimensionChanged"
      @created="onDimensionCreated"
    />
  </AdminLayout>
</template>
