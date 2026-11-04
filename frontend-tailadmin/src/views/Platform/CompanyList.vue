<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Companies" />

    <div class="space-y-6">
      <ComponentCard
        title="Companies"
        desc="Semua tenant/perusahaan di platform ini. Halaman ini hanya untuk Super Admin."
      >
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="w-full sm:max-w-xs">
            <BaseInput
              id="company-search"
              :model-value="search"
              placeholder="Cari nama, kode, atau slug..."
              @update:model-value="onSearchInput"
            />
          </div>
        </div>

        <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />

        <BaseTable
          :is-empty="items.length === 0"
          empty-message="Belum ada perusahaan."
          aria-label="Daftar perusahaan"
        >
          <template #header>
            <BaseTableRow variant="header">
              <BaseTableHead>Code</BaseTableHead>
              <BaseTableHead>Name</BaseTableHead>
              <BaseTableHead>Slug</BaseTableHead>
              <BaseTableHead>Phone</BaseTableHead>
              <BaseTableHead align="end">Users</BaseTableHead>
              <BaseTableHead>Status</BaseTableHead>
              <BaseTableHead>Created</BaseTableHead>
              <BaseTableHead align="end">Action</BaseTableHead>
            </BaseTableRow>
          </template>
          <template #body>
            <BaseTableRow v-for="item in items" :key="item.id">
              <BaseTableCell>
                <span class="text-meta">{{ item.code }}</span>
              </BaseTableCell>
              <BaseTableCell>
                <span class="text-strong">{{ item.name }}</span>
              </BaseTableCell>
              <BaseTableCell>
                <span class="text-meta">{{ item.slug }}</span>
              </BaseTableCell>
              <BaseTableCell>{{ item.phone || '—' }}</BaseTableCell>
              <BaseTableCell align="end">{{ item.userCount }}</BaseTableCell>
              <BaseTableCell>
                <Badge :color="item.isActive ? 'success' : 'error'">
                  {{ item.isActive ? 'Active' : 'Suspended' }}
                </Badge>
              </BaseTableCell>
              <BaseTableCell>{{ formatDate(item.createdAt) }}</BaseTableCell>
              <BaseTableCell align="end">
                <BaseButton
                  size="sm"
                  :variant="item.isActive ? 'danger' : 'primary'"
                  :disabled="updatingId === item.id"
                  @click="toggleStatus(item)"
                >
                  <template #start-icon>
                    {{ item.isActive ? 'Suspend' : 'Activate' }}
                    <component 
                      :is="item.isActive ? X : Check" 
                      class="h-4 w-4" 
                      aria-hidden="true" 
                    />
                  </template>

                  
                </BaseButton>
              </BaseTableCell>
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
  BaseButton,
  BaseInput,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTablePagination,
  BaseTableRow,
} from '@/components/ui'
import { ApiClientError } from '@/services/http'
import { platformCompanyService, type PlatformCompanyItem } from '@/services/platform-company.service'
import { Check, X } from 'lucide-vue-next'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

const items = ref<PlatformCompanyItem[]>([])
const meta = reactive({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
const search = ref('')
const loading = ref(false)
const updatingId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  try {
    const result = await platformCompanyService.list({
      page: meta.page,
      limit: meta.limit,
      search: search.value,
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

function goToPage(page: number): void {
  if (page < 1 || page > meta.totalPages || page === meta.page) {
    return
  }
  meta.page = page
  void load()
}

async function toggleStatus(item: PlatformCompanyItem): Promise<void> {
  const nextActive = !item.isActive
  const verb = nextActive ? 'mengaktifkan' : 'menonaktifkan (suspend)'
  if (!window.confirm(`Yakin ${verb} perusahaan "${item.name}"?`)) {
    return
  }

  updatingId.value = item.id
  errorMessage.value = null
  try {
    const result = await platformCompanyService.setStatus(item.id, nextActive)
    const target = items.value.find((row) => row.id === result.id)
    if (target) {
      target.isActive = result.isActive
    }
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    updatingId.value = null
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(() => {
  void load()
})
</script>
