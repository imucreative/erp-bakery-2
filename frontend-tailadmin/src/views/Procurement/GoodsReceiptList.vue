<script setup lang="ts">
/**
 * GoodsReceiptList — thin controller for the Goods Receipts list page.
 * List state (pagination/search/status + source-PO filter) lives in
 * `useGoodsReceipts`; the toolbar and table are separate feature components.
 * Source-PO numbers and supplier names are resolved from one-time lookups.
 * "Buat" and row "detail" navigate to dedicated full pages (form is a page).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseTablePagination } from '@/components/ui'
import { GoodsReceiptFilterBar, GoodsReceiptTable } from '@/components/procurement/goods-receipt'
import { usePermission } from '@/composables/usePermission'
import { useGoodsReceipts } from '@/composables/useGoodsReceipts'
import { supplierService } from '@/services/supplier.service'
import { purchaseOrderService, type PurchaseOrder } from '@/services/purchase-order.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { GoodsReceipt } from '@/services/goods-receipt.service'

const pageTitle = 'Goods Receipts'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('procurement.gr.create'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  purchaseOrderFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useGoodsReceipts()

// Resolve source-PO numbers and supplier names from one-time lookups.
const purchaseOrders = ref<PurchaseOrder[]>([])
const poNumbers = ref<Map<string, string>>(new Map())
const supplierNames = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const [allOrders, allSuppliers] = await Promise.all([
      fetchAllPaginated((page) => purchaseOrderService.list({ page, limit: PAGE_LIMIT })),
      fetchAllPaginated((page) =>
        supplierService.list({ page, limit: PAGE_LIMIT, isActive: 'true' }),
      ),
    ])
    purchaseOrders.value = allOrders
    poNumbers.value = new Map(allOrders.map((po) => [po.id, po.poNumber]))
    supplierNames.value = new Map(allSuppliers.map((s) => [s.id, s.name]))
  } catch {
    // Non-fatal: fall back to showing raw ids in the table.
    purchaseOrders.value = []
    poNumbers.value = new Map()
    supplierNames.value = new Map()
  }
}

function poNumber(id: string): string {
  return poNumbers.value.get(id) ?? id
}
function supplierName(id: string): string {
  return supplierNames.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'GoodsReceiptCreate' })
}

function goToDetail(gr: GoodsReceipt): void {
  void router.push({ name: 'GoodsReceiptDetail', params: { id: gr.id } })
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
      title="Goods Receipts"
      desc="Kelola penerimaan barang (GR) dari PO beserta posting stok ke inventory."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GoodsReceiptFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:purchase-order="purchaseOrderFilter"
          :purchase-orders="purchaseOrders"
        />
        <BaseButton v-if="canCreate" size="sm" variant="primary" @click="goToCreate">
          + Buat Goods Receipt
        </BaseButton>
      </div>

      <GoodsReceiptTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :po-number="poNumber"
        :supplier-name="supplierName"
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
