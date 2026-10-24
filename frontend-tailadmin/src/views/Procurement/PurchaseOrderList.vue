<script setup lang="ts">
/**
 * PurchaseOrderList — thin controller for the Purchase Orders list page.
 * List state (pagination/search/status + supplier filter) lives in
 * `usePurchaseOrders`; the toolbar and table are separate feature components.
 * Source-PR numbers and supplier names are resolved from one-time lookups.
 * "Buat" and row "detail" navigate to dedicated full pages (form is a page).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseTablePagination } from '@/components/ui'
import { PurchaseOrderFilterBar, PurchaseOrderTable } from '@/components/procurement/purchase-order'
import { usePermission } from '@/composables/usePermission'
import { usePurchaseOrders } from '@/composables/usePurchaseOrders'
import { supplierService, type Supplier } from '@/services/supplier.service'
import { purchaseRequestService } from '@/services/purchase-request.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { PurchaseOrder } from '@/services/purchase-order.service'
import { Plus } from 'lucide-vue-next'

const pageTitle = 'Purchase Orders'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('procurement.po.create'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  supplierFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = usePurchaseOrders()

// Resolve source-PR numbers and supplier names from one-time lookups.
const suppliers = ref<Supplier[]>([])
const supplierNames = ref<Map<string, string>>(new Map())
const prNumbers = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const [allSuppliers, allRequests] = await Promise.all([
      fetchAllPaginated((page) =>
        supplierService.list({ page, limit: PAGE_LIMIT, isActive: 'true' }),
      ),
      fetchAllPaginated((page) => purchaseRequestService.list({ page, limit: PAGE_LIMIT })),
    ])
    suppliers.value = allSuppliers
    supplierNames.value = new Map(allSuppliers.map((s) => [s.id, s.name]))
    prNumbers.value = new Map(allRequests.map((pr) => [pr.id, pr.prNumber]))
  } catch {
    // Non-fatal: fall back to showing raw ids in the table.
    suppliers.value = []
    supplierNames.value = new Map()
    prNumbers.value = new Map()
  }
}

function supplierName(id: string): string {
  return supplierNames.value.get(id) ?? id
}
function prNumber(id: string): string {
  return prNumbers.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'PurchaseOrderCreate' })
}

function goToDetail(po: PurchaseOrder): void {
  void router.push({ name: 'PurchaseOrderDetail', params: { id: po.id } })
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
      title="Purchase Orders"
      desc="Kelola order pembelian (PO) ke vendor beserta persetujuannya."
    >
      <!-- Toolbar -->
      <div class="toolbar-row">
        <PurchaseOrderFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:supplier="supplierFilter"
          :suppliers="suppliers"
        />
        <BaseButton v-if="canCreate" size="sm" variant="primary" @click="goToCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Buat Purchase Order
        </BaseButton>
      </div>

      <PurchaseOrderTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :pr-number="prNumber"
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
