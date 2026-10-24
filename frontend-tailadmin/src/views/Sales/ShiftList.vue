<script setup lang="ts">
/**
 * ShiftList — thin controller for the cashier Shift list page. List state
 * (pagination + status/outlet filters) lives in `useShifts`; the toolbar and
 * table are separate feature components. Shift rows include their outlet and
 * cashier names; only accessible outlets are loaded for the filter options.
 */
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseTablePagination } from '@/components/ui'
import { ShiftFilterBar, ShiftTable } from '@/components/sales'
import { useShifts } from '@/composables/useShifts'
import { outletService, type Outlet } from '@/services/outlet.service'

const pageTitle = 'Shift Kasir'

const {
  items,
  meta,
  loading,
  errorMessage,
  statusFilter,
  outletFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useShifts()

const outlets = ref<Outlet[]>([])

async function loadLookups(): Promise<void> {
  try {
    outlets.value = await outletService.getAccessible()
  } catch {
    outlets.value = []
  }
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
      title="Shift Kasir"
      desc="Riwayat shift kasir beserta rekonsiliasi kas (awal, diharapkan, aktual, selisih)."
    >
      <div class="toolbar-row">
        <ShiftFilterBar
          v-model:status="statusFilter"
          v-model:outlet="outletFilter"
          :outlets="outlets"
        />
      </div>

      <ShiftTable :items="items" :loading="loading" :error-message="errorMessage" />

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
