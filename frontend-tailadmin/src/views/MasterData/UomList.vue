<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard title="Units of Measure" desc="Kelola satuan ukur untuk perusahaan Anda.">
      <!-- Toolbar: search + create -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <input
            v-model="search"
            type="text"
            placeholder="Cari satuan..."
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
        <Button v-if="canManage" size="sm" variant="primary" :on-click="openCreate">
          + Tambah UOM
        </Button>
      </div>

      <!-- States -->
      <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Memuat data...
      </div>
      <div
        v-else-if="errorMessage"
        class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        role="alert"
      >
        {{ errorMessage }}
      </div>
      <div
        v-else-if="items.length === 0"
        class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        Belum ada satuan ukur.
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th
                class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >
                Nama
              </th>
              <th
                class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >
                Status
              </th>
              <th
                class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="uom in items"
              :key="uom.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ uom.name }}
              </td>
              <td class="px-5 py-4">
                <Badge :color="uom.isActive ? 'success' : 'error'">
                  {{ uom.isActive ? 'Aktif' : 'Nonaktif' }}
                </Badge>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="canManage"
                    type="button"
                    class="text-theme-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    @click="openEdit(uom)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    class="text-theme-sm font-medium text-error-500 hover:text-error-600"
                    @click="openDelete(uom)"
                  >
                    Hapus
                  </button>
                  <span
                    v-if="!canManage"
                    class="text-theme-xs text-gray-400 dark:text-gray-500"
                  >
                    —
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading && !errorMessage && items.length > 0"
        class="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row"
      >
        <span class="text-theme-sm text-gray-500 dark:text-gray-400">
          Menampilkan {{ items.length }} dari {{ meta.total }} data
        </span>
        <div class="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="page <= 1"
            :on-click="prevPage"
          >
            Sebelumnya
          </Button>
          <span class="text-theme-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ meta.totalPages || 1 }}
          </span>
          <Button
            size="sm"
            variant="outline"
            :disabled="page >= (meta.totalPages || 1)"
            :on-click="nextPage"
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </ComponentCard>

    <!-- Create / Edit Modal -->
    <Modal v-if="formOpen" :full-screen-backdrop="true" @close="closeForm">
      <template #body>
        <div
          class="relative w-full max-w-md rounded-3xl bg-white p-6 dark:bg-gray-900"
        >
          <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            {{ isEdit ? 'Edit UOM' : 'Tambah UOM' }}
          </h4>

          <form @submit.prevent="submitForm" class="space-y-4">
            <div>
              <label
                class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Nama<span class="text-error-500">*</span>
              </label>
              <input
                v-model="formName"
                type="text"
                placeholder="mis. PCS, KG, LITER"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <label
              v-if="isEdit"
              class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-400"
            >
              <input v-model="formActive" type="checkbox" class="h-4 w-4 rounded" />
              Aktif
            </label>

            <p
              v-if="formError"
              class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
            >
              {{ formError }}
            </p>

            <div class="flex justify-end gap-3 pt-2">
              <Button size="sm" variant="outline" :disabled="submitting" :on-click="closeForm">
                Batal
              </Button>
              <button
                type="submit"
                :disabled="submitting"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ submitting ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </template>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-if="deleteOpen" :full-screen-backdrop="true" @close="closeDelete">
      <template #body>
        <div class="relative w-full max-w-md rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h4 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Hapus UOM
          </h4>
          <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
            Yakin menghapus "{{ deleteTarget?.name }}"? Tindakan ini tidak dapat dibatalkan.
          </p>
          <p
            v-if="deleteError"
            class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
          >
            {{ deleteError }}
          </p>
          <div class="flex justify-end gap-3">
            <Button size="sm" variant="outline" :disabled="deleting" :on-click="closeDelete">
              Batal
            </Button>
            <button
              type="button"
              :disabled="deleting"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
              @click="confirmDelete"
            >
              {{ deleting ? 'Menghapus...' : 'Hapus' }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Modal from '@/components/ui/Modal.vue'
import { usePermission } from '@/composables/usePermission'
import { ApiClientError } from '@/services/http'
import {
  uomService,
  type Uom,
  type UomListParams,
} from '@/services/uom.service'

const pageTitle = 'Units of Measure'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('uom.manage'))

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

const items = ref<Uom[]>([])
const meta = ref<{ page: number; limit: number; total: number; totalPages: number }>({
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 0,
})
const loading = ref<boolean>(false)
const errorMessage = ref<string | null>(null)

const search = ref<string>('')
const debouncedSearch = ref<string>('')
const page = ref<number>(1)
let searchTimer: ReturnType<typeof setTimeout> | undefined

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

async function fetchList(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  try {
    const params: UomListParams = {
      page: page.value,
      limit: DEFAULT_LIMIT,
      search: debouncedSearch.value || undefined,
    }
    const result = await uomService.list(params)
    items.value = result.items
    meta.value = result.meta
  } catch (error) {
    errorMessage.value = toMessage(error)
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(search, (value) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value.trim()
    page.value = 1
    void fetchList()
  }, SEARCH_DEBOUNCE_MS)
})

function prevPage(): void {
  if (page.value > 1) {
    page.value -= 1
    void fetchList()
  }
}

function nextPage(): void {
  if (page.value < (meta.value.totalPages || 1)) {
    page.value += 1
    void fetchList()
  }
}

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const isEdit = ref<boolean>(false)
const editingId = ref<string | null>(null)
const formName = ref<string>('')
const formActive = ref<boolean>(true)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  isEdit.value = false
  editingId.value = null
  formName.value = ''
  formActive.value = true
  formError.value = null
  formOpen.value = true
}

function openEdit(uom: Uom): void {
  isEdit.value = true
  editingId.value = uom.id
  formName.value = uom.name
  formActive.value = uom.isActive
  formError.value = null
  formOpen.value = true
}

function closeForm(): void {
  formOpen.value = false
}

async function submitForm(): Promise<void> {
  const name = formName.value.trim()
  if (name.length === 0) {
    formError.value = 'Nama wajib diisi.'
    return
  }
  submitting.value = true
  formError.value = null
  try {
    if (isEdit.value && editingId.value) {
      await uomService.update(editingId.value, { name, isActive: formActive.value })
    } else {
      await uomService.create({ name })
    }
    formOpen.value = false
    await fetchList()
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────
const deleteOpen = ref<boolean>(false)
const deleteTarget = ref<Uom | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(uom: Uom): void {
  deleteTarget.value = uom
  deleteError.value = null
  deleteOpen.value = true
}

function closeDelete(): void {
  deleteOpen.value = false
  deleteTarget.value = null
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) {
    return
  }
  deleting.value = true
  deleteError.value = null
  try {
    await uomService.remove(deleteTarget.value.id)
    deleteOpen.value = false
    deleteTarget.value = null
    // If we removed the last row on a page, step back a page when possible.
    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await fetchList()
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}

void fetchList()
</script>
