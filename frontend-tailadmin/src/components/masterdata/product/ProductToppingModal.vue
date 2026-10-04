<script setup lang="ts">
/**
 * ProductToppingModal — "Kelola Topping" per produk. Mengelola CRUD daftar
 * topping yang diizinkan untuk SATU produk jual (mewujudkan POS made-to-order +
 * topping). Setiap topping menunjuk ke produk lain (RAW_MATERIAL / SEMI_FINISHED)
 * dengan takaran per item + harga tambahan.
 *
 * Komponen self-contained: fetch daftar topping saat dibuka, lalu
 * create/update/delete via productToppingService. Daftar produk topping untuk
 * dropdown diterima via prop `toppingProducts` (konsisten dengan UOM modal yang
 * menerima `uoms` via prop). Dropdown "tambah" meng-EXCLUDE produk itu sendiri
 * (hindari 400 SELF_TOPPING) & topping yang sudah dipakai (hindari 409
 * DUPLICATE). Error backend disurface, dan kegagalan tetap mempertahankan state.
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
import {
  productToppingService,
  type ProductTopping,
} from '@/services/product-topping.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    product?: Product | null
    toppingProducts: Product[]
    canManage: boolean
  }>(),
  { product: null },
)

const emit = defineEmits<{
  (event: 'close'): void
}>()

// ── List state ───────────────────────────────────────────────────────
const rows = ref<ProductTopping[]>([])
const loading = ref<boolean>(false)
const listError = ref<string | null>(null)

// ── Add-form state ───────────────────────────────────────────────────
const addToppingProductId = ref<string>('')
const addQty = ref<number | null>(null)
const addExtraPrice = ref<number | null>(0)
const addActive = ref<boolean>(true)
const adding = ref<boolean>(false)
const addError = ref<string | null>(null)

// ── Per-row edit state ───────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editQty = ref<number | null>(null)
const editExtraPrice = ref<number | null>(null)
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

const qtyFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 })
function formatQty(value: number): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return qtyFormatter.format(amount)
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})
function formatIdr(value: number): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return idrFormatter.format(amount)
}

/**
 * Produk yang boleh dijadikan topping: aktif, bukan produk itu sendiri (hindari
 * 400 SELF_TOPPING), dan belum dipakai sebagai topping existing (hindari 409
 * DUPLICATE). Tipe RAW_MATERIAL / SEMI_FINISHED sudah difilter oleh pemanggil
 * (backend menolak tipe lain), namun kita tetap aman karena hanya meneruskan
 * `toppingProducts` yang diberikan.
 */
const availableToppingProducts = computed<Product[]>(() => {
  const selfId = props.product?.id ?? ''
  const usedIds = new Set(rows.value.map((r) => r.toppingProductId))
  return props.toppingProducts.filter(
    (p) => p.isActive && p.id !== selfId && !usedIds.has(p.id),
  )
})

const toppingLabel = (product: Product): string => `${product.name} (${product.sku})`

async function loadToppings(): Promise<void> {
  const p = props.product
  if (!p) {
    return
  }
  loading.value = true
  listError.value = null
  try {
    rows.value = await productToppingService.list(p.id)
  } catch (error) {
    listError.value = toMessage(error)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function resetAddForm(): void {
  addToppingProductId.value = ''
  addQty.value = null
  addExtraPrice.value = 0
  addActive.value = true
  addError.value = null
}

function cancelEdit(): void {
  editingId.value = null
  editQty.value = null
  editExtraPrice.value = null
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
      void loadToppings()
    }
  },
  { immediate: true },
)

async function onAdd(): Promise<void> {
  const p = props.product
  if (!p) {
    return
  }
  if (!addToppingProductId.value) {
    addError.value = 'Pilih produk topping terlebih dahulu.'
    return
  }
  const qty = Number(addQty.value)
  if (!Number.isFinite(qty) || qty <= 0) {
    addError.value = 'Takaran per item harus lebih besar dari 0.'
    return
  }
  const extraPrice = Number(addExtraPrice.value ?? 0)
  if (!Number.isFinite(extraPrice) || extraPrice < 0) {
    addError.value = 'Harga tambahan tidak boleh negatif.'
    return
  }
  adding.value = true
  addError.value = null
  try {
    await productToppingService.create(p.id, {
      toppingProductId: addToppingProductId.value,
      defaultQtyPerItem: qty,
      extraPrice,
      isActive: addActive.value,
    })
    resetAddForm()
    await loadToppings()
  } catch (error) {
    addError.value = toMessage(error)
  } finally {
    adding.value = false
  }
}

function startEdit(row: ProductTopping): void {
  editingId.value = row.id
  editQty.value = row.defaultQtyPerItem
  editExtraPrice.value = row.extraPrice
  editActive.value = row.isActive
  rowError.value = null
}

async function onSaveEdit(): Promise<void> {
  const p = props.product
  if (!p || !editingId.value) {
    return
  }
  const qty = Number(editQty.value)
  if (!Number.isFinite(qty) || qty <= 0) {
    rowError.value = 'Takaran per item harus lebih besar dari 0.'
    return
  }
  const extraPrice = Number(editExtraPrice.value ?? 0)
  if (!Number.isFinite(extraPrice) || extraPrice < 0) {
    rowError.value = 'Harga tambahan tidak boleh negatif.'
    return
  }
  savingEdit.value = true
  rowError.value = null
  try {
    await productToppingService.update(p.id, editingId.value, {
      defaultQtyPerItem: qty,
      extraPrice,
      isActive: editActive.value,
    })
    cancelEdit()
    await loadToppings()
  } catch (error) {
    rowError.value = toMessage(error)
  } finally {
    savingEdit.value = false
  }
}

async function onDelete(row: ProductTopping): Promise<void> {
  const p = props.product
  if (!p) {
    return
  }
  if (!window.confirm(`Hapus topping "${row.toppingName}" dari produk ini?`)) {
    return
  }
  deletingId.value = row.id
  rowError.value = null
  try {
    await productToppingService.remove(p.id, row.id)
    if (editingId.value === row.id) {
      cancelEdit()
    }
    await loadToppings()
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
      <h4 class="text-lg font-semibold text-gray-800 dark:text-white/90">Kelola Topping</h4>
      <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        {{ product?.name ?? '—' }}
      </p>

      <!-- Info -->
      <div
        class="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-theme-xs text-gray-500 dark:text-gray-400">
          Topping diambil dari produk bahan baku / setengah jadi. Takaran per item
          memakai satuan dasar topping, dan harga tambahan dibebankan ke pelanggan
          saat topping dipilih di POS made-to-order.
        </p>
      </div>

      <!-- Existing toppings -->
      <div class="mt-5">
        <h5 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Daftar topping</h5>

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
          Belum ada topping.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <th
                  class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Topping
                </th>
                <th
                  class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Takaran / Item
                </th>
                <th
                  class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Harga Tambahan
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
                  <span class="font-medium">{{ row.toppingName }}</span>
                  <span class="ms-1 text-theme-xs text-gray-500 dark:text-gray-400">
                    ({{ row.toppingSku }})
                  </span>
                </td>
                <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
                  <template v-if="editingId === row.id">
                    <input
                      v-model.number="editQty"
                      type="number"
                      min="0"
                      step="any"
                      :class="[inputClass, 'h-9 w-28 text-end']"
                    />
                  </template>
                  <template v-else>
                    {{ formatQty(row.defaultQtyPerItem) }}
                    <span class="ms-1 text-theme-xs text-gray-500 dark:text-gray-400">
                      {{ row.uomCode }}
                    </span>
                  </template>
                </td>
                <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
                  <template v-if="editingId === row.id">
                    <input
                      v-model.number="editExtraPrice"
                      type="number"
                      min="0"
                      step="any"
                      :class="[inputClass, 'h-9 w-32 text-end']"
                    />
                  </template>
                  <template v-else>
                    {{ formatIdr(row.extraPrice) }}
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
                    <span v-else class="text-theme-xs text-gray-400 dark:text-gray-500"> — </span>
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

      <!-- Add topping -->
      <div v-if="canManage" class="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
        <h5 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Tambah topping</h5>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label :class="labelClass">
              Produk topping<span class="text-error-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="addToppingProductId"
                :disabled="availableToppingProducts.length === 0"
                :class="[
                  inputClass,
                  'appearance-none pe-10',
                  availableToppingProducts.length === 0 ? 'cursor-not-allowed opacity-60' : '',
                ]"
              >
                <option value="" disabled>
                  {{
                    availableToppingProducts.length === 0
                      ? 'Tidak ada produk topping tersedia'
                      : 'Pilih produk topping'
                  }}
                </option>
                <option v-for="p in availableToppingProducts" :key="p.id" :value="p.id">
                  {{ toppingLabel(p) }}
                </option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label :class="labelClass">
              Takaran per item<span class="text-error-500">*</span>
            </label>
            <input
              v-model.number="addQty"
              type="number"
              min="0"
              step="any"
              placeholder="mis. 10"
              :class="inputClass"
            />
          </div>
          <div>
            <label :class="labelClass">Harga tambahan</label>
            <input
              v-model.number="addExtraPrice"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              :class="inputClass"
            />
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <ToggleSwitch v-model="addActive" label="Aktif" />
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">
            Harga tambahan:
            <span class="font-medium">{{
              formatIdr(Number(addExtraPrice ?? 0) >= 0 ? Number(addExtraPrice ?? 0) : 0)
            }}</span>
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
            :disabled="adding || availableToppingProducts.length === 0"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            @click="onAdd"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
            {{ adding ? 'Menambahkan...' : 'Tambah Topping' }}
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
