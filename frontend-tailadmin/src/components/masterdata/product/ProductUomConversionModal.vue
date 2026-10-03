<script setup lang="ts">
/**
 * ProductUomConversionModal — "Satuan & Konversi" per produk (Tahap 1 / master
 * data konversi). Mengelola CRUD daftar satuan ALTERNATIF untuk SATU produk.
 *
 * Arti faktor: 1 <satuan alternatif> = factorToBase <satuan dasar produk>.
 * Satuan dasar produk (products.uomId) berfaktor implisit 1 dan hanya informatif.
 *
 * Komponen self-contained: fetch daftar konversi saat dibuka, lalu
 * create/update/delete via productUomConversionService. Dropdown "tambah"
 * meng-EXCLUDE satuan dasar produk & UOM yang sudah dipakai sebagai konversi
 * (hindari 400 UOM_IS_BASE_UNIT / 409 DUPLICATE). Error backend disurface,
 * dan kegagalan tetap mempertahankan state modal.
 *
 * Transparent backdrop + rounded-3xl per UI standard.
 */
import { computed, ref, watch } from 'vue'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { ApiClientError } from '@/services/http'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'
import {
  productUomConversionService,
  type ProductUomConversion,
} from '@/services/product-uom-conversion.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    product?: Product | null
    uoms: Uom[]
    uomNameById: Record<string, string>
    canManage: boolean
  }>(),
  { product: null },
)

const emit = defineEmits<{
  (event: 'close'): void
}>()

// ── List state ───────────────────────────────────────────────────────
const rows = ref<ProductUomConversion[]>([])
const loading = ref<boolean>(false)
const listError = ref<string | null>(null)

// ── Add-form state ───────────────────────────────────────────────────
const addUomId = ref<string>('')
const addFactor = ref<number | null>(null)
const addActive = ref<boolean>(true)
const adding = ref<boolean>(false)
const addError = ref<string | null>(null)

// ── Per-row edit state ───────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editFactor = ref<number | null>(null)
const editActive = ref<boolean>(true)
const savingEdit = ref<boolean>(false)
const rowError = ref<string | null>(null)

// ── Delete state ─────────────────────────────────────────────────────
const deletingId = ref<string | null>(null)

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

const factorFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 })
function formatFactor(value: number): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return factorFormatter.format(amount)
}

const baseUomName = computed<string>(() => {
  const p = props.product
  if (!p) {
    return '—'
  }
  return props.uomNameById[p.uomId] || p.uomId
})

const uomLabel = (uom: Uom): string => uom.name

/**
 * UOM yang boleh ditambahkan: aktif, bukan satuan dasar produk, dan belum
 * dipakai sebagai konversi existing. Mencegah 400 (base/inactive) & 409 (dup).
 */
const availableUoms = computed<Uom[]>(() => {
  const baseUomId = props.product?.uomId ?? ''
  const usedIds = new Set(rows.value.map((r) => r.uomId))
  return props.uoms.filter(
    (u) => u.isActive && u.id !== baseUomId && !usedIds.has(u.id),
  )
})

async function loadConversions(): Promise<void> {
  const p = props.product
  if (!p) {
    return
  }
  loading.value = true
  listError.value = null
  try {
    rows.value = await productUomConversionService.list(p.id)
  } catch (error) {
    listError.value = toMessage(error)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function resetAddForm(): void {
  addUomId.value = ''
  addFactor.value = null
  addActive.value = true
  addError.value = null
}

function cancelEdit(): void {
  editingId.value = null
  editFactor.value = null
  editActive.value = true
  rowError.value = null
}

watch(
  () => [props.open, props.product] as const,
  ([open]) => {
    if (open) {
      resetAddForm()
      cancelEdit()
      listError.value = null
      void loadConversions()
    }
  },
  { immediate: true },
)

async function onAdd(): Promise<void> {
  const p = props.product
  if (!p) {
    return
  }
  if (!addUomId.value) {
    addError.value = 'Pilih satuan alternatif terlebih dahulu.'
    return
  }
  const factor = Number(addFactor.value)
  if (!Number.isFinite(factor) || factor <= 0) {
    addError.value = 'Faktor harus lebih besar dari 0.'
    return
  }
  adding.value = true
  addError.value = null
  try {
    await productUomConversionService.create(p.id, {
      uomId: addUomId.value,
      factorToBase: factor,
      isActive: addActive.value,
    })
    resetAddForm()
    await loadConversions()
  } catch (error) {
    addError.value = toMessage(error)
  } finally {
    adding.value = false
  }
}

function startEdit(row: ProductUomConversion): void {
  editingId.value = row.id
  editFactor.value = row.factorToBase
  editActive.value = row.isActive
  rowError.value = null
}

async function onSaveEdit(): Promise<void> {
  const p = props.product
  if (!p || !editingId.value) {
    return
  }
  const factor = Number(editFactor.value)
  if (!Number.isFinite(factor) || factor <= 0) {
    rowError.value = 'Faktor harus lebih besar dari 0.'
    return
  }
  savingEdit.value = true
  rowError.value = null
  try {
    await productUomConversionService.update(p.id, editingId.value, {
      factorToBase: factor,
      isActive: editActive.value,
    })
    cancelEdit()
    await loadConversions()
  } catch (error) {
    rowError.value = toMessage(error)
  } finally {
    savingEdit.value = false
  }
}

async function onDelete(row: ProductUomConversion): Promise<void> {
  const p = props.product
  if (!p) {
    return
  }
  if (!window.confirm(`Hapus konversi "${row.uomName}" dari produk ini?`)) {
    return
  }
  deletingId.value = row.id
  rowError.value = null
  try {
    await productUomConversionService.remove(p.id, row.id)
    if (editingId.value === row.id) {
      cancelEdit()
    }
    await loadConversions()
  } catch (error) {
    rowError.value = toMessage(error)
  } finally {
    deletingId.value = null
  }
}

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="text-lg font-semibold text-gray-800 dark:text-white/90">Satuan &amp; Konversi</h4>
      <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        {{ product?.name ?? '—' }}
      </p>

      <!-- Base unit info (read-only) -->
      <div
        class="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-gray-600 dark:text-gray-300">Satuan dasar</span>
          <span class="font-medium text-gray-800 dark:text-white/90">
            {{ baseUomName }}
            <span class="ms-1 text-theme-xs text-gray-500 dark:text-gray-400">(faktor 1)</span>
          </span>
        </div>
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          Faktor konversi berarti: 1 satuan alternatif = faktor &times; satuan dasar
          (<span class="font-medium">{{ baseUomName }}</span>).
        </p>
      </div>

      <!-- Existing conversions -->
      <div class="mt-5">
        <h5 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Daftar konversi</h5>

        <div v-if="loading" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Memuat data...
        </div>

        <div
          v-else-if="listError"
          class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
          role="alert"
        >
          {{ listError }}
        </div>

        <div
          v-else-if="rows.length === 0"
          class="py-6 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          Belum ada satuan alternatif.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <th
                  class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Satuan Alternatif
                </th>
                <th
                  class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Faktor
                </th>
                <th
                  class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Status
                </th>
                <th
                  class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.id"
                class="border-b border-gray-100 dark:border-gray-800"
              >
                <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
                  <span class="font-medium">{{ row.uomName }}</span>
                  <span class="ms-1 text-theme-xs text-gray-500 dark:text-gray-400">
                    ({{ row.uomCode }})
                  </span>
                </td>
                <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
                  <template v-if="editingId === row.id">
                    <input
                      v-model.number="editFactor"
                      type="number"
                      min="0"
                      step="any"
                      :class="[inputClass, 'h-9 w-32 text-end']"
                    />
                  </template>
                  <template v-else>
                    {{ formatFactor(row.factorToBase) }}
                  </template>
                </td>
                <td class="px-4 py-3">
                  <template v-if="editingId === row.id">
                    <ToggleSwitch v-model="editActive" label="Aktif" />
                  </template>
                  <template v-else>
                    <Badge :color="row.isActive ? 'success' : 'error'">
                      {{ row.isActive ? 'Aktif' : 'Nonaktif' }}
                    </Badge>
                  </template>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <template v-if="editingId === row.id">
                      <button
                        type="button"
                        aria-label="Simpan"
                        title="Simpan"
                        :disabled="savingEdit"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-success-600 ring-1 ring-inset ring-success-200 transition hover:bg-success-50 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-success-500/30 dark:hover:bg-success-500/10"
                        @click="onSaveEdit"
                      >
                        <Check class="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Batal"
                        title="Batal"
                        :disabled="savingEdit"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                        @click="cancelEdit"
                      >
                        <X class="h-4 w-4" aria-hidden="true" />
                      </button>
                    </template>
                    <template v-else-if="canManage">
                      <button
                        type="button"
                        aria-label="Edit"
                        title="Edit"
                        :disabled="deletingId === row.id || editingId !== null"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                        @click="startEdit(row)"
                      >
                        <Pencil class="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus"
                        title="Hapus"
                        :disabled="deletingId === row.id || editingId !== null"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-error-500 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-error-500/30 dark:hover:bg-error-500/10"
                        @click="onDelete(row)"
                      >
                        <Trash2 class="h-4 w-4" aria-hidden="true" />
                      </button>
                    </template>
                    <span
                      v-else
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

        <p
          v-if="rowError"
          class="mt-3 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
          role="alert"
        >
          {{ rowError }}
        </p>
      </div>

      <!-- Add conversion -->
      <div
        v-if="canManage"
        class="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
      >
        <h5 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Tambah satuan alternatif
        </h5>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Satuan alternatif<span class="text-error-500">*</span></label>
            <div class="relative">
              <select
                v-model="addUomId"
                :disabled="availableUoms.length === 0"
                :class="[
                  inputClass,
                  'appearance-none pe-10',
                  availableUoms.length === 0 ? 'cursor-not-allowed opacity-60' : '',
                ]"
              >
                <option value="" disabled>
                  {{ availableUoms.length === 0 ? 'Tidak ada satuan tersedia' : 'Pilih satuan' }}
                </option>
                <option v-for="u in availableUoms" :key="u.id" :value="u.id">
                  {{ uomLabel(u) }}
                </option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label :class="labelClass">
              Faktor ke satuan dasar<span class="text-error-500">*</span>
            </label>
            <input
              v-model.number="addFactor"
              type="number"
              min="0"
              step="any"
              placeholder="mis. 25000"
              :class="inputClass"
            />
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <ToggleSwitch v-model="addActive" label="Aktif" />
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">
            1
            <span class="font-medium">{{
              availableUoms.find((u) => u.id === addUomId)?.name || 'satuan alternatif'
            }}</span>
            = {{ addFactor && addFactor > 0 ? formatFactor(Number(addFactor)) : '…' }}
            <span class="font-medium">{{ baseUomName }}</span>
          </p>
        </div>

        <p
          v-if="addError"
          class="mt-3 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
          role="alert"
        >
          {{ addError }}
        </p>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            :disabled="adding || availableUoms.length === 0"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            @click="onAdd"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
            {{ adding ? 'Menambahkan...' : 'Tambah Konversi' }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-6 flex justify-end">
        <Button size="sm" variant="outline" :on-click="() => emit('close')">Tutup</Button>
      </div>
    </div>
  </div>
</template>
