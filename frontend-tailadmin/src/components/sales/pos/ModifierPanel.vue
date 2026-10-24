<script setup lang="ts">
/**
 * ModifierPanel — center column shown when a MADE_TO_ORDER product with
 * `hasToppings === true` is selected. The topping list is the GLOBAL catalog
 * (`toppings` prop, loaded once from GET /sales/pos/toppings by the parent) —
 * NOT per-product anymore (doc 51 Fase 6b). Each topping is a ToggleSwitch row
 * with its extra price + default qty; "Tambah ke Cart" emits the chosen
 * toppings to the parent. Works fine with zero toppings (plain add). Stateless:
 * the parent owns the selected product; local state is only the toggle set,
 * reset whenever the product changes.
 */
import { ref, watch } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
import { formatRupiah } from '@/lib/format'
import type { PosProduct, PosToppingOption } from '@/services/sales.service'

const props = defineProps<{
  product: PosProduct
  toppings: PosToppingOption[]
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

/** Why a topping cannot be used. `null` when it can. */
type ToppingBlockReason = 'EXPIRED' | 'OUT_OF_STOCK'

const TOPPING_BLOCK_LABELS: Record<ToppingBlockReason, string> = {
  EXPIRED: 'Kedaluwarsa',
  OUT_OF_STOCK: 'Stok habis',
}

/**
 * `null` when the topping can be used; otherwise the reason it is disabled.
 * `availableQty` is OPTIONAL (safe degradation): a backend that has not shipped
 * the field yet yields `undefined`, which is NOT `=== 0`, so the topping stays
 * usable and checkout remains the final guard — toppings are never hidden.
 */
function blockReason(topping: PosToppingOption): ToppingBlockReason | null {
  if (topping.availableQty !== 0) {
    return null
  }
  return (topping.expiredQty ?? 0) > 0 ? 'EXPIRED' : 'OUT_OF_STOCK'
}

function isSelected(id: string): boolean {
  return selectedIds.value.has(id)
}

function setSelected(topping: PosToppingOption, value: boolean): void {
  // An unusable topping can never be toggled on, even if a stale selection
  // survived a refresh of its stock.
  if (value && blockReason(topping) !== null) {
    return
  }
  const next = new Set(selectedIds.value)
  if (value) {
    next.add(topping.toppingProductId)
  } else {
    next.delete(topping.toppingProductId)
  }
  selectedIds.value = next
}

function onAdd(): void {
  // Only usable, selected toppings leave the panel — a blocked topping never
  // reaches the cart through any path.
  const chosen = props.toppings.filter(
    (t) => selectedIds.value.has(t.toppingProductId) && blockReason(t) === null,
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
        <h4 class="section-title">
          {{ props.product.name }}
        </h4>
        <p class="mt-0.5 text-base font-semibold text-brand-600 dark:text-brand-400">
          {{ formatRupiah(props.product.sellingPrice) }}
        </p>
      </div>
      <BaseButton
        variant="outline"
        icon-only
        aria-label="Tutup panel topping"
        title="Tutup panel topping"
        @click="emit('cancel')"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </BaseButton>
    </div>

    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-muted-xs uppercase">Topping</p>
      <span class="text-muted-xs">Opsional</span>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="props.toppings.length === 0"
        class="rounded-lg border border-dashed border-gray-200 py-6 text-center text-theme-sm text-gray-400 dark:border-gray-700 dark:text-gray-500"
      >
        Belum ada topping aktif yang tersedia.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="topping in props.toppings"
          :key="topping.toppingProductId"
          class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
          :class="
            blockReason(topping)
              ? 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40'
              : 'border-gray-200 dark:border-gray-800'
          "
        >
          <div class="flex min-w-0 flex-col gap-1">
            <ToggleSwitch
              :model-value="isSelected(topping.toppingProductId)"
              :label="topping.toppingName"
              :disabled="blockReason(topping) !== null"
              @update:model-value="(v) => setSelected(topping, v)"
            />
            <Badge
              v-if="blockReason(topping)"
              size="sm"
              :color="blockReason(topping) === 'EXPIRED' ? 'error' : 'light'"
            >
              {{ TOPPING_BLOCK_LABELS[blockReason(topping)!] }} — tidak bisa dipakai
            </Badge>
          </div>
          <!-- <div class="text-end">
            <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ topping.extraPrice > 0 ? `+ ${formatRupiah(topping.extraPrice)}` : 'Gratis' }}
            </p>
            <p class="text-theme-xs text-gray-400 dark:text-gray-500">
              ×{{ formatNumber(topping.defaultQtyPerItem) }}
            </p>
          </div> -->
        </div>
      </div>
    </div>

    <p class="mt-3 text-muted-xs">
      Topping opsional — bisa langsung tambah ke cart tanpa memilih topping.
    </p>

    <BaseButton full-width class="mt-2" @click="onAdd">
      <template #start-icon>
        <Plus class="h-4 w-4" aria-hidden="true" />
      </template>
      Tambah ke Cart
    </BaseButton>
  </div>
</template>
