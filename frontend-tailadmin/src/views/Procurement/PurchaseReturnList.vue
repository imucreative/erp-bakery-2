<script setup lang="ts">
/**
 * PurchaseReturnList — thin controller for the Purchase Returns list page.
 * List state (pagination/search/status + source-GR/supplier filters) lives in
 * `usePurchaseReturns`; the toolbar and table are separate feature components.
 * Source-GR numbers come from one-time lookups (also used as GR filter options);
 * suppliers feed the supplier filter + names. "Buat" and row "detail" navigate
 * to dedicated full pages (form is a page).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseTablePagination } from '@/components/ui'
import {
  PurchaseReturnFilterBar,
  PurchaseReturnTable,
} from '@/components/procurement/purchase-return'
import { usePermission } from '@/composables/usePermission'
import { usePurchaseReturns } from '@/composables/usePurchaseReturns'
import { supplierService, type Supplier } from '@/services/supplier.service'
import { goodsReceiptService, type GoodsReceipt } from '@/services/goods-receipt.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { PurchaseReturn } from '@/services/purchase-return.service'
import { Plus } from 'lucide-vue-next'

const pageTitle = 'Purchase Returns'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('procurement.return.create'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  goodsReceiptFilter,
  supplierFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = usePurchaseReturns()

// Resolve source-GR numbers and supplier filter options from one-time lookups.
const goodsReceipts = ref<GoodsReceipt[]>([])
const suppliers = ref<Supplier[]>([])
const grNumbers = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const [allReceipts, allSuppliers] = await Promise.all([
      fetchAllPaginated((p) => goodsReceiptService.list({ page: p, limit: PAGE_LIMIT })),
      fetchAllPaginated((p) =>
        supplierService.list({ page: p, limit: PAGE_LIMIT, isActive: 'true' }),
      ),
    ])
    goodsReceipts.value = allReceipts
    suppliers.value = allSuppliers
    grNumbers.value = new Map(allReceipts.map((gr) => [gr.id, gr.grNumber]))
  } catch {
    // Non-fatal: fall back to showing raw ids in the table.
    goodsReceipts.value = []
    suppliers.value = []
    grNumbers.value = new Map()
  }
}

function grNumber(id: string): string {
  return grNumbers.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'PurchaseReturnCreate' })
}

function goToDetail(pr: PurchaseReturn): void {
  void router.push({ name: 'PurchaseReturnDetail', params: { id: pr.id } })
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
      title="Purchase Returns"
      desc="Kelola retur pembelian (reversal GR) ke vendor beserta posting pengembalian stok."
    >
      <!-- Toolbar -->
      <div class="toolbar-row">
        <PurchaseReturnFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:goods-receipt="goodsReceiptFilter"
          v-model:supplier="supplierFilter"
          :goods-receipts="goodsReceipts"
          :suppliers="suppliers"
        />
        <BaseButton v-if="canCreate" size="sm" variant="primary" @click="goToCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Buat Retur
        </BaseButton>
      </div>

      <PurchaseReturnTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :gr-number="grNumber"
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
