<script setup lang="ts">
/**
 * StockOpnameList — thin controller for the Stock Opname list page. List state
 * (pagination/search/status + outlet filter) lives in `useStockOpnames`; the
 * toolbar and table are separate feature components. Outlet names are resolved
 * from a one-time lookup. "Buat" and row "detail" navigate to dedicated full
 * pages (the form is a page, not a modal).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  StockOpnameFilterBar,
  StockOpnameTable,
} from '@/components/inventory/stock-opname'
import { usePermission } from '@/composables/usePermission'
import { useStockOpnames } from '@/composables/useStockOpnames'
import { outletService, type Outlet } from '@/services/outlet.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { StockOpname } from '@/services/stock-opname.service'

const pageTitle = 'Stock Opname'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('inventory.stock-count.create'))

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
} = useStockOpnames()

// Resolve outlet names from a one-time lookup.
const outlets = ref<Outlet[]>([])
const outletNames = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const allOutlets = await fetchAllPaginated((pageNum) =>
      outletService.list({ page: pageNum, limit: PAGE_LIMIT }),
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
  void router.push({ name: 'InventoryStockOpnameCreate' })
}

function goToDetail(opname: StockOpname): void {
  void router.push({ name: 'InventoryStockOpnameDetail', params: { id: opname.id } })
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
      title="Stock Opname"
      desc="Kelola dokumen penghitungan stok fisik per outlet; selisih direkonsiliasi otomatis saat diselesaikan."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StockOpnameFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:outlet="outletFilter"
          :outlets="outlets"
        />
        <Button
          v-if="canCreate"
          size="sm"
          variant="primary"
          :start-icon="Plus"
          :on-click="goToCreate"
        >
          Buat Opname
        </Button>
      </div>

      <StockOpnameTable
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
