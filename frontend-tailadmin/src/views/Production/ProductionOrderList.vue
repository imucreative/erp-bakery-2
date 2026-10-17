<script setup lang="ts">
/**
 * ProductionOrderList — thin controller for the Production Orders list page.
 * List state (pagination/search/status + outlet filter) lives in
 * `useProductionOrders`; the toolbar and table are separate feature components.
 * Names for the order's product and outlet are returned with each order; the
 * accessible outlet list is used only to populate the filter.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseTablePagination } from '@/components/ui'
import {
  ProductionOrderFilterBar,
  ProductionOrderTable,
} from '@/components/production/production-order'
import { usePermission } from '@/composables/usePermission'
import { useProductionOrders } from '@/composables/useProductionOrders'
import { outletService, type Outlet } from '@/services/outlet.service'
import type { ProductionOrder } from '@/services/production-order.service'
import { Plus } from 'lucide-vue-next'

const pageTitle = 'Production Orders'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('production-order.manage'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  outletFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useProductionOrders()

// The outlet filter only lists outlets the current user may access.
const outlets = ref<Outlet[]>([])
const outletNames = ref<Map<string, string>>(new Map())
const lookupError = ref<string | null>(null)

async function loadLookups(): Promise<void> {
  try {
    const accessibleOutlets = await outletService.getAccessible()
    outlets.value = accessibleOutlets
    outletNames.value = new Map(accessibleOutlets.map((o) => [o.id, o.name]))
    lookupError.value = null
  } catch {
    outlets.value = []
    outletNames.value = new Map()
    lookupError.value = 'Tidak dapat memuat daftar outlet untuk filter.'
  }
}

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'ProductionOrderCreate' })
}

function goToDetail(order: ProductionOrder): void {
  void router.push({ name: 'ProductionOrderDetail', params: { id: order.id } })
}

onMounted(() => {
  void loadLookups()
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Production Orders"
      desc="Perintah produksi instan: konversi bahan baku menjadi barang jadi melalui resep (BOM) dalam satu aksi."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProductionOrderFilterBar
          v-model:search="search"
          v-model:outlet="outletFilter"
          :outlets="outlets"
        />
        <BaseButton v-if="canCreate" size="sm" variant="primary" @click="goToCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Produksi
        </BaseButton>
      </div>

      <p
        v-if="lookupError"
        class="mb-3 rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
        role="status"
      >
        {{ lookupError }}
      </p>

      <ProductionOrderTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :outlet-name="outletName"
        @view="goToDetail"
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
  </AdminLayout>
</template>
