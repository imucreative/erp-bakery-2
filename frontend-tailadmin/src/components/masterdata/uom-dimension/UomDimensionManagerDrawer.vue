<script setup lang="ts">
/**
 * UomDimensionManagerDrawer — single management surface for the global UOM
 * dimension catalog, opened from the Units of Measure page. The drawer owns the
 * view state machine (list → form / confirm) and mutations while each view is a
 * separate presentational component, so no dialogs are stacked.
 *
 * Creating a dimension also creates its canonical (smallest) factor-1 UOM in
 * one flow, so the anchor unit exists before other units are added. Code and
 * canonical unit are immutable once stored because every factor references
 * them.
 */
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { BaseButton, BaseModal } from '@/components/ui'
import UomDimensionListPanel from './UomDimensionListPanel.vue'
import UomDimensionFormPanel from './UomDimensionFormPanel.vue'
import UomDimensionDeletePanel from './UomDimensionDeletePanel.vue'
import { useUomDimensions } from '@/composables/useUomDimensions'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    canManage: boolean
    initialMode?: 'list' | 'create'
  }>(),
  { initialMode: 'list' },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'changed'): void
  (event: 'created', dimension: UomDimensionDefinition): void
}>()

type ManagerView = 'list' | 'create' | 'edit' | 'confirm'

const view = ref<ManagerView>('list')
const editing = ref<UomDimensionDefinition | null>(null)
const deleteTarget = ref<UomDimensionDefinition | null>(null)
const formError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const deleting = ref<boolean>(false)

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

const title = computed<string>(() => {
  switch (view.value) {
    case 'create':
      return 'Tambah Dimensi UOM'
    case 'edit':
      return 'Edit Dimensi UOM'
    case 'confirm':
      return 'Hapus Dimensi UOM'
    default:
      return 'Kelola Dimensi UOM'
  }
})

const description = computed<string>(() => {
  switch (view.value) {
    case 'list':
      return 'Dimensi mengelompokkan satuan yang boleh saling dikonversi. Setiap dimensi punya satuan terkecil (kanonik) dengan faktor 1.'
    case 'confirm':
      return 'Hapus hanya untuk dimensi yang sudah tidak dipakai satuan mana pun.'
    default:
      return 'Satuan kanonik adalah satuan terkecil — semua faktor UOM lain di dimensinya minimal 1.'
  }
})

const formMode = computed<'create' | 'edit'>(() => (view.value === 'edit' ? 'edit' : 'create'))

function showList(): void {
  view.value = 'list'
  editing.value = null
  deleteTarget.value = null
  formError.value = null
  deleteError.value = null
}

function openCreate(): void {
  editing.value = null
  formError.value = null
  view.value = 'create'
}

function openEdit(dimension: UomDimensionDefinition): void {
  editing.value = dimension
  formError.value = null
  view.value = 'edit'
}

function openConfirm(dimension: UomDimensionDefinition): void {
  deleteTarget.value = dimension
  deleteError.value = null
  view.value = 'confirm'
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return
    }
    showList()
    if (props.initialMode === 'create') {
      openCreate()
    }
    void fetchList()
  },
  { immediate: true },
)

async function onSubmit(payload: {
  code: string
  name: string
  canonicalUnitName: string
  canonicalUnitSymbol: string
  isActive: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (view.value === 'edit' && editing.value) {
      await updateDimension(editing.value.code, {
        name: payload.name,
        isActive: payload.isActive,
      })
    } else {
      const created = await createDimension({
        code: payload.code,
        name: payload.name,
        canonicalUnitName: payload.canonicalUnitName,
        canonicalUnitSymbol: payload.canonicalUnitSymbol,
        isActive: payload.isActive,
      })
      emit('created', created)
    }
    emit('changed')
    showList()
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

async function onConfirmDelete(): Promise<void> {
  if (!deleteTarget.value) {
    return
  }
  deleting.value = true
  deleteError.value = null
  try {
    await deleteDimension(deleteTarget.value.code)
    emit('changed')
    showList()
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" placement="end" size="2xl" scrollable @close="emit('close')">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h4 class="modal-title">{{ title }}</h4>
        <p class="text-meta mt-1">{{ description }}</p>
      </div>
      <BaseButton
        size="sm"
        variant="outline"
        icon-only
        aria-label="Tutup"
        title="Tutup"
        @click="emit('close')"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </BaseButton>
    </div>

    <UomDimensionListPanel
      v-if="view === 'list'"
      v-model:search="search"
      :items="filteredItems"
      :loading="loading"
      :error-message="errorMessage"
      :can-manage="canManage"
      @create="openCreate"
      @edit="openEdit"
      @delete="openConfirm"
    />

    <UomDimensionFormPanel
      v-else-if="view === 'create' || view === 'edit'"
      :mode="formMode"
      :dimension="editing"
      :submitting="submitting"
      :error-message="formError"
      @submit="onSubmit"
      @cancel="showList"
    />

    <UomDimensionDeletePanel
      v-else
      :dimension="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @cancel="showList"
      @confirm="onConfirmDelete"
    />
  </BaseModal>
</template>
