<script setup lang="ts">
/**
 * PurchaseRequestList — thin controller for the Purchase Requests list page.
 * List state (pagination/search/status filter) lives in `usePurchaseRequests`;
 * the toolbar and table are separate feature components. Destination outlet
 * names are resolved from a one-time active-outlet fetch. "Buat" and row
 * "detail" navigate to dedicated full pages (form is a page, not a modal).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  PurchaseRequestFilterBar,
  PurchaseRequestTable,
} from '@/components/procurement/purchase-request'
import { usePermission } from '@/composables/usePermission'
import { usePurchaseRequests } from '@/composables/usePurchaseRequests'
import { outletService } from '@/services/outlet.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { PurchaseRequest } from '@/services/purchase-request.service'

const pageTitle = 'Purchase Requests'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('procurement.pr.create'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = usePurchaseRequests()

// Resolve destination outlet names from a one-time active-outlet fetch.
const outletNames = ref<Map<string, string>>(new Map())

async function loadOutlets(): Promise<void> {
  try {
    const allOutlets = await fetchAllPaginated((page) =>
      outletService.list({ page, limit: PAGE_LIMIT, isActive: 'true' }),
    )
    outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  } catch {
    // Non-fatal: fall back to showing the raw id in the table.
    outletNames.value = new Map()
  }
}

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'PurchaseRequestCreate' })
}

function goToDetail(pr: PurchaseRequest): void {
  void router.push({ name: 'PurchaseRequestDetail', params: { id: pr.id } })
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
      title="Purchase Requests"
      desc="Kelola permintaan pembelian (PR) beserta persetujuannya."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PurchaseRequestFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
        />
        <Button v-if="canCreate" size="sm" variant="primary" :on-click="goToCreate">
          + Buat Purchase Request
        </Button>
      </div>

      <PurchaseRequestTable
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
