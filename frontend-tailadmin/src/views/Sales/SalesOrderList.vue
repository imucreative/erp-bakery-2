<script setup lang="ts">
/**
 * SalesOrderList — thin controller for the Sales Order list page. List state
 * (pagination/search/status + outlet/shift filters) lives in `useSalesOrders`;
 * the toolbar and table are separate feature components. Outlets feed the outlet
 * filter + names; OPEN+CLOSED shifts feed the shift filter options. Row "detail"
 * navigates to the dedicated detail page.
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import { SalesOrderFilterBar, SalesOrderTable } from '@/components/sales'
import { useSalesOrders } from '@/composables/useSalesOrders'
import { outletService, type Outlet } from '@/services/outlet.service'
import { salesService, type Shift, type SalesOrder } from '@/services/sales.service'
import { PAGE_LIMIT } from '@/lib/fetchAll'

const pageTitle = 'Sales Orders'
const router = useRouter()

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  outletFilter,
  shiftFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useSalesOrders()

const outlets = ref<Outlet[]>([])
const shifts = ref<Shift[]>([])
const outletNames = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const [accessibleOutlets, shiftResult] = await Promise.all([
      outletService.getAccessible(),
      salesService.shifts.list({ page: 1, limit: PAGE_LIMIT }),
    ])
    outlets.value = accessibleOutlets
    outletNames.value = new Map(accessibleOutlets.map((o) => [o.id, o.name]))
    shifts.value = shiftResult.items
  } catch {
    outlets.value = []
    outletNames.value = new Map()
    shifts.value = []
  }
}

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}

function goToDetail(order: SalesOrder): void {
  void router.push({ name: 'SalesOrderDetail', params: { id: order.id } })
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
      title="Sales Orders"
      desc="Riwayat transaksi penjualan POS beserta status pembayaran dan refund."
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SalesOrderFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:outlet="outletFilter"
          v-model:shift="shiftFilter"
          :outlets="outlets"
          :shifts="shifts"
        />
      </div>

      <SalesOrderTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :outlet-name="outletName"
        @view="goToDetail"
      />

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
