<script setup lang="ts">
/**
 * CartPanel — right column. Renders cart lines (product + topping sub-rows + qty
 * stepper + per-item discount + line total), the customer name + order-discount
 * inputs, the subtotal/total, and a "Bayar" button. Stateless: all cart state
 * lives in the parent (usePosCart); this component emits intents and binds the
 * customerName / orderDiscount via v-model.
 */
import { Minus, Plus, Trash2, CreditCard } from 'lucide-vue-next'
import { BaseButton, BaseFormField, BaseInput } from '@/components/ui'
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
    <BaseFormField label="Nama Customer" field-id="pos-customer-name" class="mb-3">
      <BaseInput
        id="pos-customer-name"
        :model-value="props.customerName"
        placeholder="Opsional"
        @update:model-value="emit('update:customerName', $event)"
      />
    </BaseFormField>

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
              <ul v-if="line.selectedToppings.length > 0" class="mt-1 space-y-0.5">
                <li
                  v-for="topping in line.selectedToppings"
                  :key="topping.toppingProductId"
                  class="text-meta"
                >
                  + {{ topping.toppingName }}
                  <span v-if="topping.extraPrice > 0" class="text-gray-400 dark:text-gray-500">
                    ({{ formatRupiah(topping.extraPrice) }})
                  </span>
                </li>
              </ul>
            </div>
            <BaseButton
              variant="danger"
              icon-only
              class="shrink-0"
              aria-label="Hapus item"
              title="Hapus item"
              @click="emit('remove', line.lineId)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <BaseButton
                variant="outline"
                icon-only
                aria-label="Kurangi jumlah"
                title="Kurangi jumlah"
                @click="emit('set-qty', line.lineId, line.qty - 1)"
              >
                <Minus class="h-4 w-4" aria-hidden="true" />
              </BaseButton>
              <span
                class="w-8 text-center text-theme-sm font-medium text-gray-800 dark:text-white/90"
              >
                {{ line.qty }}
              </span>
              <BaseButton
                variant="outline"
                icon-only
                aria-label="Tambah jumlah"
                title="Tambah jumlah"
                @click="emit('set-qty', line.lineId, line.qty + 1)"
              >
                <Plus class="h-4 w-4" aria-hidden="true" />
              </BaseButton>
            </div>
            <p class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {{ formatRupiah(props.lineTotal(line)) }}
            </p>
          </div>

          <div class="mt-2 flex items-center gap-2">
            <label :for="`pos-item-discount-${line.lineId}`" class="text-meta"> Diskon item </label>
            <div class="w-28">
              <BaseInput
                :id="`pos-item-discount-${line.lineId}`"
                :model-value="line.itemDiscount"
                type="number"
                min="0"
                step="500"
                @update:model-value="emit('set-item-discount', line.lineId, Number($event))"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Totals + pay -->
    <div class="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      <div class="flex items-center justify-between gap-3">
        <label for="pos-order-discount" class="text-muted"> Diskon Order </label>
        <div class="w-32">
          <BaseInput
            id="pos-order-discount"
            :model-value="props.orderDiscount"
            type="number"
            min="0"
            step="500"
            class="text-end"
            @update:model-value="emit('update:orderDiscount', Number($event))"
          />
        </div>
      </div>
      <div class="flex items-center justify-between text-theme-sm">
        <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
        <span class="text-gray-800 dark:text-white/90">{{ formatRupiah(props.subtotal) }}</span>
      </div>
      <div class="flex items-center justify-between text-base font-semibold">
        <span class="text-gray-800 dark:text-white/90">Total</span>
        <span class="text-brand-600 dark:text-brand-400">{{ formatRupiah(props.grandTotal) }}</span>
      </div>
      <BaseButton v-if="props.canManage" full-width :disabled="props.isEmpty" @click="emit('pay')">
        <template #start-icon>
          <CreditCard class="h-4 w-4" aria-hidden="true" />
        </template>
        Bayar
      </BaseButton>
    </div>
  </div>
</template>
