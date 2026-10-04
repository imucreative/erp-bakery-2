<script setup lang="ts">
/**
 * ModifierPanel — center column shown when a MADE_TO_ORDER product is selected.
 * Lists the product's available toppings (`product.toppings`) as ToggleSwitch
 * rows with their extra price + default qty; "Tambah ke Cart" emits the chosen
 * toppings to the parent. Works fine with zero toppings (plain add). Stateless:
 * the parent owns the selected product; local state is only the toggle set,
 * reset whenever the product changes.
 */
import { ref, watch } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { formatRupiah, formatNumber } from '@/lib/format'
import type { PosProduct, PosToppingOption } from '@/services/sales.service'

const props = defineProps<{
  product: PosProduct
}>()

const emit = defineEmits<{
  (event: 'add', toppings: PosToppingOption[]): void
  (event: 'cancel'): void
}>()

// Set of selected toppingProductIds for the current product.
const selectedIds = ref<Set<string>>(new Set())

watch(
  () => props.product.productId,
  () => {
    selectedIds.value = new Set()
  },
  { immediate: true },
)

function isSelected(id: string): boolean {
  return selectedIds.value.has(id)
}

function setSelected(topping: PosToppingOption, value: boolean): void {
  const next = new Set(selectedIds.value)
  if (value) {
    next.add(topping.toppingProductId)
  } else {
    next.delete(topping.toppingProductId)
  }
  selectedIds.value = next
}

function onAdd(): void {
  const chosen = props.product.toppings.filter((t) =>
    selectedIds.value.has(t.toppingProductId),
  )
  emit('add', chosen)
}
</script>

<template>
  <div
    class="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="mb-3 flex items-start justify-between gap-2">
      <div>
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {{ props.product.name }}
        </h4>
        <p class="mt-0.5 text-base font-semibold text-brand-600 dark:text-brand-400">
          {{ formatRupiah(props.product.sellingPrice) }}
        </p>
      </div>
      <button
        type="button"
        aria-label="Tutup panel topping"
        title="Tutup panel topping"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
        @click="emit('cancel')"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <p class="mb-2 text-theme-xs uppercase text-gray-400 dark:text-gray-500">Topping</p>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="props.product.toppings.length === 0"
        class="rounded-lg border border-dashed border-gray-200 py-6 text-center text-theme-sm text-gray-400 dark:border-gray-700 dark:text-gray-500"
      >
        Tidak ada topping untuk produk ini.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="topping in props.product.toppings"
          :key="topping.toppingProductId"
          class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800"
        >
          <ToggleSwitch
            :model-value="isSelected(topping.toppingProductId)"
            :label="topping.toppingName"
            @update:model-value="(v) => setSelected(topping, v)"
          />
          <div class="text-end">
            <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ topping.extraPrice > 0 ? `+ ${formatRupiah(topping.extraPrice)}` : 'Gratis' }}
            </p>
            <p class="text-theme-xs text-gray-400 dark:text-gray-500">
              ×{{ formatNumber(topping.defaultQtyPerItem) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
      @click="onAdd"
    >
      <Plus class="h-4 w-4" aria-hidden="true" />
      Tambah ke Cart
    </button>
  </div>
</template>
