<script setup lang="ts">
/**
 * StockOnHandList — thin controller for the read-only Stock On Hand list page.
 * List state (pagination / debounced search / outlet filter / low-only toggle)
 * lives in `useStockOnHand`; the toolbar and table are separate feature
 * components. Outlet options for the filter dropdown are resolved from a
 * one-time active-outlet fetch (same pattern as the PR list). Read-only: no
 * create button, no row actions.
 */
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  StockOnHandFilterBar,
  StockOnHandTable,
} from '@/components/inventory/stock-on-hand'
import { useStockOnHand } from '@/composables/useStockOnHand'
import { outletService } from '@/services/outlet.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const pageTitle = 'Stock On Hand'

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  outletId,
  lowOnly,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useStockOnHand()

interface OutletOption {
  id: string
  name: string
}

// Resolve active outlets once for the filter dropdown.
const outlets = ref<OutletOption[]>([])

async function loadOutlets(): Promise<void> {
  try {
    const allOutlets = await fetchAllPaginated((page) =>
      outletService.list({ page, limit: PAGE_LIMIT, isActive: 'true' }),
    )
    outlets.value = allOutlets.map((o) => ({ id: o.id, name: o.name }))
  } catch {
    // Non-fatal: the dropdown falls back to "Semua Outlet" only.
    outlets.value = []
  }
}

onMounted(() => {
  void loadOutlets()
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Stock On Hand"
      desc="Pantau saldo stok tersedia per produk dan outlet."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StockOnHandFilterBar
          v-model:search="search"
          v-model:outlet-id="outletId"
          v-model:low-only="lowOnly"
          :outlets="outlets"
        />
      </div>

      <StockOnHandTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
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
