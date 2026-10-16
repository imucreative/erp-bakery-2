<script setup lang="ts">
/**
 * ToppingList — thin controller/composition for the GLOBAL Topping master page
 * (POS modifier catalog, doc 51 Fase 6b). List state + CRUD live in
 * `useToppings`; table and modals are separate components. This view only wires
 * them together and owns modal open/mode state. Guard: list = product.read,
 * create/edit/delete = product.manage.
 */
import { computed, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput } from '@/components/ui'
import { Plus } from 'lucide-vue-next'
import ToppingTable from '@/components/masterdata/topping/ToppingTable.vue'
import ToppingFormModal from '@/components/masterdata/topping/ToppingFormModal.vue'
import ToppingDeleteModal from '@/components/masterdata/topping/ToppingDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useToppings } from '@/composables/useToppings'
import type { Topping } from '@/services/topping.service'

const pageTitle = 'Toppings'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('product.manage'))

const {
  items,
  total,
  loading,
  errorMessage,
  search,
  availableToppingProducts,
  ensureToppingProducts,
  fetchList,
  createTopping,
  updateTopping,
  deleteTopping,
  toMessage,
} = useToppings()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Topping | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

async function openCreate(): Promise<void> {
  await ensureToppingProducts()
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(topping: Topping): void {
  formMode.value = 'edit'
  editing.value = topping
  formError.value = null
  formOpen.value = true
}

async function onSubmitCreate(payload: {
  toppingProductId: string
  defaultQtyPerItem: number
  extraPrice: number
  isActive: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    await createTopping({
      toppingProductId: payload.toppingProductId,
      defaultQtyPerItem: payload.defaultQtyPerItem,
      extraPrice: payload.extraPrice,
      isActive: payload.isActive,
    })
    formOpen.value = false
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

async function onSubmitEdit(payload: {
  defaultQtyPerItem: number
  extraPrice: number
  isActive: boolean
}): Promise<void> {
  if (!editing.value) {
    return
  }
  submitting.value = true
  formError.value = null
  try {
    await updateTopping(editing.value.id, {
      defaultQtyPerItem: payload.defaultQtyPerItem,
      extraPrice: payload.extraPrice,
      isActive: payload.isActive,
    })
    formOpen.value = false
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────
const deleteOpen = ref<boolean>(false)
const deleteTarget = ref<Topping | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(topping: Topping): void {
  deleteTarget.value = topping
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
    await deleteTopping(deleteTarget.value.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Toppings"
      desc="Katalog topping global untuk produk made-to-order di POS."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput
            id="topping-search"
            v-model="search"
            placeholder="Cari topping (nama / SKU)..."
          />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Tambah Topping
        </BaseButton>
      </div>

      <ToppingTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        @edit="openEdit"
        @delete="openDelete"
      />

      <!-- Count footer -->
      <div
        v-if="!loading && !errorMessage && items.length > 0"
        class="pt-2 text-theme-sm text-gray-500 dark:text-gray-400"
      >
        Menampilkan {{ items.length }} dari {{ total }} topping
      </div>
    </ComponentCard>

    <ToppingFormModal
      :open="formOpen"
      :mode="formMode"
      :topping="editing"
      :product-options="availableToppingProducts"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit-create="onSubmitCreate"
      @submit-edit="onSubmitEdit"
    />

    <ToppingDeleteModal
      :open="deleteOpen"
      :topping="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
