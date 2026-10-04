<script setup lang="ts">
/**
 * CartPanel — right column. Renders cart lines (product + topping sub-rows + qty
 * stepper + per-item discount + line total), the customer name + order-discount
 * inputs, the subtotal/total, and a "Bayar" button. Stateless: all cart state
 * lives in the parent (usePosCart); this component emits intents and binds the
 * customerName / orderDiscount via v-model.
 */
import { Minus, Plus, Trash2, CreditCard } from 'lucide-vue-next'
import { formatRupiah } from '@/lib/format'
import type { CartLine } from '@/composables/usePosCart'

const props = defineProps<{
  lines: CartLine[]
  subtotal: number
  grandTotal: number
  orderDiscount: number
  customerName: string
  lineTotal: (line: CartLine) => number
  isEmpty: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  (event: 'update:orderDiscount', value: number): void
  (event: 'update:customerName', value: string): void
  (event: 'set-qty', lineId: number, qty: number): void
  (event: 'set-item-discount', lineId: number, value: number): void
  (event: 'remove', lineId: number): void
  (event: 'pay'): void
}>()
</script>

<template>
  <div
    class="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="mb-3">
      <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        Nama Customer
      </label>
      <input
        :value="props.customerName"
        type="text"
        placeholder="Opsional"
        class="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:customerName', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="props.isEmpty"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-center dark:border-gray-700"
      >
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Keranjang kosong</p>
        <p class="mt-1 text-theme-sm text-gray-400 dark:text-gray-500">
          Pilih produk untuk mulai transaksi.
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="line in props.lines"
          :key="line.lineId"
          class="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ line.product.name }}
              </p>
              <ul
                v-if="line.selectedToppings.length > 0"
                class="mt-1 space-y-0.5"
              >
                <li
                  v-for="topping in line.selectedToppings"
                  :key="topping.toppingProductId"
                  class="text-theme-xs text-gray-500 dark:text-gray-400"
                >
                  + {{ topping.toppingName }}
                  <span v-if="topping.extraPrice > 0" class="text-gray-400 dark:text-gray-500">
                    ({{ formatRupiah(topping.extraPrice) }})
                  </span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              aria-label="Hapus item"
              title="Hapus item"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-error-500 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 dark:ring-error-500/30 dark:hover:bg-error-500/10"
              @click="emit('remove', line.lineId)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                title="Kurangi jumlah"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
                @click="emit('set-qty', line.lineId, line.qty - 1)"
              >
                <Minus class="h-4 w-4" aria-hidden="true" />
              </button>
              <span class="w-8 text-center text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ line.qty }}
              </span>
              <button
                type="button"
                aria-label="Tambah jumlah"
                title="Tambah jumlah"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
                @click="emit('set-qty', line.lineId, line.qty + 1)"
              >
                <Plus class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {{ formatRupiah(props.lineTotal(line)) }}
            </p>
          </div>

          <div class="mt-2 flex items-center gap-2">
            <label class="text-theme-xs text-gray-500 dark:text-gray-400">Diskon item</label>
            <input
              :value="line.itemDiscount"
              type="number"
              min="0"
              step="500"
              class="h-9 w-28 rounded-lg border border-gray-300 bg-transparent px-3 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              @input="emit('set-item-discount', line.lineId, Number(($event.target as HTMLInputElement).value))"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Totals + pay -->
    <div class="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      <div class="flex items-center justify-between gap-3">
        <label class="text-theme-sm text-gray-500 dark:text-gray-400">Diskon Order</label>
        <input
          :value="props.orderDiscount"
          type="number"
          min="0"
          step="500"
          class="h-9 w-32 rounded-lg border border-gray-300 bg-transparent px-3 text-end text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          @input="emit('update:orderDiscount', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="flex items-center justify-between text-theme-sm">
        <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
        <span class="text-gray-800 dark:text-white/90">{{ formatRupiah(props.subtotal) }}</span>
      </div>
      <div class="flex items-center justify-between text-base font-semibold">
        <span class="text-gray-800 dark:text-white/90">Total</span>
        <span class="text-brand-600 dark:text-brand-400">{{ formatRupiah(props.grandTotal) }}</span>
      </div>
      <button
        v-if="props.canManage"
        type="button"
        :disabled="props.isEmpty"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        @click="emit('pay')"
      >
        <CreditCard class="h-4 w-4" aria-hidden="true" />
        Bayar
      </button>
    </div>
  </div>
</template>
