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
import Badge from '@/components/ui/Badge.vue'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
  BaseToggle,
} from '@/components/ui'
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
  return p.uomName || props.uomNameById[p.uomId] || p.uomId
})

/**
 * UOM yang boleh ditambahkan: aktif, bukan satuan dasar produk, dan belum
 * dipakai sebagai konversi existing. Mencegah 400 (base/inactive) & 409 (dup).
 */
const availableUoms = computed<Uom[]>(() => {
  const baseUomId = props.product?.uomId ?? ''
  const usedIds = new Set(rows.value.map((r) => r.uomId))
  return props.uoms.filter((u) => u.isActive && u.id !== baseUomId && !usedIds.has(u.id))
})

const availableUomOptions = computed(() =>
  availableUoms.value.map((uom) => ({ label: uom.name, value: uom.id })),
)

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

function updateAddFactor(value: string): void {
  addFactor.value = value === '' ? null : Number(value)
}

function updateEditFactor(value: string): void {
  editFactor.value = value === '' ? null : Number(value)
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
</script>

<template>
  <BaseModal :open="open" size="2xl" scrollable @close="emit('close')">
    <h4 class="modal-title">Satuan &amp; Konversi</h4>
    <p class="text-muted mt-1">
      {{ product?.name ?? '—' }}
    </p>

    <!-- Base unit info (read-only) -->
    <div class="form-readonly py-3 mt-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-gray-600 dark:text-gray-300">Satuan dasar</span>
        <span class="font-medium text-gray-800 dark:text-white/90">
          {{ baseUomName }}
          <span class="ms-1 text-meta">(faktor 1)</span>
        </span>
      </div>
      <p class="mt-2 text-meta">
        Faktor konversi berarti: 1 satuan alternatif = faktor &times; satuan dasar (<span
          class="font-medium"
          >{{ baseUomName }}</span
        >).
      </p>
    </div>

    <!-- Existing conversions -->
    <div class="mt-5">
      <h5 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Daftar konversi</h5>

      <BaseTable
        :loading="loading"
        :error-message="listError"
        :is-empty="rows.length === 0"
        empty-message="Belum ada satuan alternatif."
        aria-label="Daftar konversi satuan"
      >
        <template #header>
          <BaseTableRow variant="header">
            <BaseTableHead>Satuan Alternatif</BaseTableHead>
            <BaseTableHead align="end">Faktor</BaseTableHead>
            <BaseTableHead>Status</BaseTableHead>
            <BaseTableHead align="end">Aksi</BaseTableHead>
          </BaseTableRow>
        </template>
        <template #body>
          <BaseTableRow v-for="row in rows" :key="row.id">
            <BaseTableCell emphasis="medium">
              <span class="font-medium">{{ row.uomName }}</span>
              <span class="ms-1 text-meta"> ({{ row.uomCode }}) </span>
            </BaseTableCell>
            <BaseTableCell align="end" emphasis="medium">
              <template v-if="editingId === row.id">
                <BaseInput
                  :id="`conversion-factor-${row.id}`"
                  :model-value="editFactor ?? ''"
                  type="number"
                  min="0"
                  step="any"
                  class="h-9 w-32 text-end"
                  @update:model-value="updateEditFactor"
                />
              </template>
              <template v-else>
                {{ formatFactor(row.factorToBase) }}
              </template>
            </BaseTableCell>
            <BaseTableCell>
              <template v-if="editingId === row.id">
                <BaseToggle v-model="editActive" label="Aktif" />
              </template>
              <template v-else>
                <Badge :color="row.isActive ? 'success' : 'error'">
                  {{ row.isActive ? 'Aktif' : 'Nonaktif' }}
                </Badge>
              </template>
            </BaseTableCell>
            <BaseTableCell align="end">
              <div class="flex items-center justify-end gap-2">
                <template v-if="editingId === row.id">
                  <BaseButton
                    size="sm"
                    variant="success"
                    icon-only
                    aria-label="Simpan"
                    title="Simpan"
                    :disabled="savingEdit"
                    @click="onSaveEdit"
                  >
                    <Check class="h-4 w-4" aria-hidden="true" />
                  </BaseButton>
                  <BaseButton
                    size="sm"
                    variant="outline"
                    icon-only
                    aria-label="Batal"
                    title="Batal"
                    :disabled="savingEdit"
                    @click="cancelEdit"
                  >
                    <X class="h-4 w-4" aria-hidden="true" />
                  </BaseButton>
                </template>
                <template v-else-if="canManage">
                  <BaseButton
                    size="sm"
                    variant="outline"
                    icon-only
                    aria-label="Edit"
                    title="Edit"
                    :disabled="deletingId === row.id || editingId !== null"
                    @click="startEdit(row)"
                  >
                    <Pencil class="h-4 w-4" aria-hidden="true" />
                  </BaseButton>
                  <BaseButton
                    size="sm"
                    variant="danger"
                    icon-only
                    aria-label="Hapus"
                    title="Hapus"
                    :disabled="deletingId === row.id || editingId !== null"
                    @click="onDelete(row)"
                  >
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </BaseButton>
                </template>
                <span v-else class="text-muted-xs"> — </span>
              </div>
            </BaseTableCell>
          </BaseTableRow>
        </template>
      </BaseTable>

      <BaseAlert :message="rowError" size="sm" class="mt-3" />
    </div>

    <!-- Add conversion -->
    <div v-if="canManage" class="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <h5 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        Tambah satuan alternatif
      </h5>
      <div class="field-grid">
        <BaseFormField label="Satuan alternatif" field-id="conversion-uom" required>
          <BaseSelect
            id="conversion-uom"
            v-model="addUomId"
            :options="availableUomOptions"
            :disabled="availableUoms.length === 0"
            :placeholder="availableUoms.length === 0 ? 'Tidak ada satuan tersedia' : 'Pilih satuan'"
          />
        </BaseFormField>
        <BaseFormField label="Faktor ke satuan dasar" field-id="conversion-factor" required>
          <BaseInput
            id="conversion-factor"
            :model-value="addFactor ?? ''"
            type="number"
            min="0"
            step="any"
            placeholder="mis. 25000"
            @update:model-value="updateAddFactor"
          />
        </BaseFormField>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <BaseToggle v-model="addActive" label="Aktif" />
        <p class="text-meta">
          1
          <span class="font-medium">{{
            availableUoms.find((u) => u.id === addUomId)?.name || 'satuan alternatif'
          }}</span>
          = {{ addFactor && addFactor > 0 ? formatFactor(Number(addFactor)) : '…' }}
          <span class="font-medium">{{ baseUomName }}</span>
        </p>
      </div>

      <BaseAlert :message="addError" size="sm" class="mt-3" />

      <div class="mt-4 button-row">
        <BaseButton
          variant="success"
          :disabled="adding || availableUoms.length === 0"
          :loading="adding"
          loading-text="Menambahkan..."
          @click="onAdd"
        >
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah Konversi
        </BaseButton>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-6 button-row">
      <BaseButton size="sm" variant="outline" @click="emit('close')">Tutup</BaseButton>
    </div>
  </BaseModal>
</template>
