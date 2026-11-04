<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Platform Users" />

    <div class="space-y-6">
      <ComponentCard
        title="Users"
        desc="Semua user lintas perusahaan (read-only). Halaman ini hanya untuk Super Admin."
      >
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
            <div class="w-full sm:max-w-xs">
              <BaseInput
                id="user-search"
                :model-value="search"
                placeholder="Cari nama atau email..."
                @update:model-value="onSearchInput"
              />
            </div>
            <div class="w-full sm:max-w-xs">
              <BaseSelect
                id="user-company"
                :model-value="companyId"
                :options="companyOptions"
                @update:model-value="onCompanyChange"
              />
            </div>
          </div>
        </div>

        <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />

        <BaseTable
          :is-empty="items.length === 0"
          empty-message="Belum ada user."
          aria-label="Daftar user platform"
        >
          <template #header>
            <BaseTableRow variant="header">
              <BaseTableHead>Name</BaseTableHead>
              <BaseTableHead>Email</BaseTableHead>
              <BaseTableHead>Company</BaseTableHead>
              <BaseTableHead>Role</BaseTableHead>
              <BaseTableHead>Super Admin</BaseTableHead>
              <BaseTableHead>Status</BaseTableHead>
              <BaseTableHead>Created</BaseTableHead>
            </BaseTableRow>
          </template>
          <template #body>
            <BaseTableRow v-for="item in items" :key="item.id">
              <BaseTableCell>
                <span class="text-strong">{{ item.name }}</span>
              </BaseTableCell>
              <BaseTableCell>
                <span class="text-meta">{{ item.email }}</span>
              </BaseTableCell>
              <BaseTableCell>{{ item.companyName || '— (platform)' }}</BaseTableCell>
              <BaseTableCell>{{ item.roleName || item.roleCode || '—' }}</BaseTableCell>
              <BaseTableCell>
                <Badge v-if="item.isSuperAdmin" color="primary">Yes</Badge>
                <span v-else class="text-meta">—</span>
              </BaseTableCell>
              <BaseTableCell>
                <Badge :color="item.isActive ? 'success' : 'error'">
                  {{ item.isActive ? 'Active' : 'Inactive' }}
                </Badge>
              </BaseTableCell>
              <BaseTableCell>{{ formatDate(item.createdAt) }}</BaseTableCell>
            </BaseTableRow>
          </template>
        </BaseTable>

        <BaseTablePagination
          class="mt-4"
          :current-count="items.length"
          :total-items="meta.total"
          :current-page="meta.page"
          :total-pages="meta.totalPages"
          :has-previous="meta.page > 1"
          :has-next="meta.page < meta.totalPages"
          @previous="goToPage(meta.page - 1)"
          @next="goToPage(meta.page + 1)"
        />
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import {
  BaseAlert,
  BaseInput,
  BaseSelect,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTablePagination,
  BaseTableRow,
} from '@/components/ui'
import { ApiClientError } from '@/services/http'
import { companyService } from '@/services/company.service'
import { platformService, type PlatformUserItem } from '@/services/platform.service'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

const items = ref<PlatformUserItem[]>([])
const meta = reactive({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
const search = ref('')
const companyId = ref('')
const companyOptions = ref<Array<{ label: string; value: string }>>([
  { label: 'All companies', value: '' },
])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

async function loadCompanies(): Promise<void> {
  try {
    const result = await companyService.list({ page: 1, limit: 100 })
    companyOptions.value = [
      { label: 'All companies', value: '' },
      ...result.items.map((company) => ({ label: company.name, value: company.id })),
    ]
  } catch {
    // The company filter is a convenience — keep the page usable without it.
    companyOptions.value = [{ label: 'All companies', value: '' }]
  }
}

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  try {
    const result = await platformService.listUsers({
      page: meta.page,
      limit: meta.limit,
      search: search.value,
      companyId: companyId.value,
    })
    items.value = result.items
    meta.page = result.meta.page
    meta.limit = result.meta.limit
    meta.total = result.meta.total
    meta.totalPages = result.meta.totalPages
  } catch (error) {
    errorMessage.value = toMessage(error)
    items.value = []
  } finally {
    loading.value = false
  }
}

function onSearchInput(value: string): void {
  search.value = value
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    meta.page = 1
    void load()
  }, SEARCH_DEBOUNCE_MS)
}

function onCompanyChange(value: string): void {
  companyId.value = value
  meta.page = 1
  void load()
}

function goToPage(page: number): void {
  if (page < 1 || page > meta.totalPages || page === meta.page) {
    return
  }
  meta.page = page
  void load()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(() => {
  void loadCompanies()
  void load()
})
</script>
