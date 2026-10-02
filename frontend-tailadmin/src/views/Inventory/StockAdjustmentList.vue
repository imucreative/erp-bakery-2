<script setup lang="ts">
/**
 * StockAdjustmentList — thin controller for the Stock Adjustments list page.
 * List state (pagination/search/status + outlet filter) lives in
 * `useStockAdjustments`; the toolbar and table are separate feature components.
 * Outlet names are resolved from a one-time lookup. "Buat" and row "detail"
 * navigate to dedicated full pages (the form is a page, not a modal).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  StockAdjustmentFilterBar,
  StockAdjustmentTable,
} from '@/components/inventory/stock-adjustment'
import { usePermission } from '@/composables/usePermission'
import { useStockAdjustments } from '@/composables/useStockAdjustments'
import { outletService, type Outlet } from '@/services/outlet.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { StockAdjustment } from '@/services/stock-adjustment.service'

const pageTitle = 'Stock Adjustments'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('inventory.adjustment.create'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  outletFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useStockAdjustments()

// Resolve outlet names from a one-time lookup.
const outlets = ref<Outlet[]>([])
const outletNames = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const allOutlets = await fetchAllPaginated((page) =>
      outletService.list({ page, limit: PAGE_LIMIT }),
    )
    outlets.value = allOutlets
    outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  } catch {
    // Non-fatal: fall back to showing raw ids in the table.
    outlets.value = []
    outletNames.value = new Map()
  }
}

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'InventoryStockAdjustmentCreate' })
}

function goToDetail(adjustment: StockAdjustment): void {
  void router.push({ name: 'InventoryStockAdjustmentDetail', params: { id: adjustment.id } })
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
      title="Stock Adjustments"
      desc="Kelola dokumen koreksi stok (penyesuaian masuk/keluar) dengan posting stok saat diselesaikan."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StockAdjustmentFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:outlet="outletFilter"
          :outlets="outlets"
        />
        <Button v-if="canCreate" size="sm" variant="primary" :on-click="goToCreate">
          + Buat Stock Adjustment
        </Button>
      </div>

      <StockAdjustmentTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :outlet-name="outletName"
        @view="goToDetail"
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
  </AdminLayout>
</template>
