<script setup lang="ts">
/**
 * ShiftList — thin controller for the cashier Shift list page. List state
 * (pagination + status/outlet filters) lives in `useShifts`; the toolbar and
 * table are separate feature components. Outlet and cashier names come from
 * one-time lookups (outlets also feed the outlet filter options).
 */
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import { ShiftFilterBar, ShiftTable } from '@/components/sales'
import { useShifts } from '@/composables/useShifts'
import { outletService, type Outlet } from '@/services/outlet.service'
import { userService } from '@/services/user.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

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
const outletNames = ref<Map<string, string>>(new Map())
const cashierNames = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const [allOutlets, allUsers] = await Promise.all([
      fetchAllPaginated((p) => outletService.list({ page: p, limit: PAGE_LIMIT })),
      fetchAllPaginated((p) => userService.list({ page: p, limit: PAGE_LIMIT })),
    ])
    outlets.value = allOutlets
    outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
    cashierNames.value = new Map(allUsers.map((u) => [u.id, u.name]))
  } catch {
    outlets.value = []
    outletNames.value = new Map()
    cashierNames.value = new Map()
  }
}

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}

function cashierName(id: string): string {
  return cashierNames.value.get(id) ?? id
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ShiftFilterBar
          v-model:status="statusFilter"
          v-model:outlet="outletFilter"
          :outlets="outlets"
        />
      </div>

      <ShiftTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :outlet-name="outletName"
        :cashier-name="cashierName"
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
