<script setup lang="ts">
/**
 * ProductGrid — POS product grid (left column). Renders a quick-search box and
 * product cards (name + price + availability). Clicking a sellable card whose
 * product accepts toppings emits `select` (parent opens the modifier panel
 * backed by the GLOBAL topping catalog); any other sellable card emits `add`
 * (straight to cart, no toppings). Stateless: the parent owns the product list,
 * loading/error, and the search string (v-model:search).
 *
 * `saleMode` is a CAPABILITY, not a fulfilment promise: it only says the product
 * has an ACTIVE recipe, which is what allows the topping panel to open. Checkout
 * resolves fulfilment per line (stock-first). The grid therefore never labels a
 * product as "sold from stock" vs "made to order" — it states the two facts the
 * cashier actually acts on: is there sellable stock, and does it take toppings.
 *
 * POS never backflushes ingredients by itself — stock only exists because a
 * Production Order / Goods Receipt put it there. Under the stock-first rule a
 * product can ONLY be sold when it has sellable stock (`availableQty > 0`) —
 * this now INCLUDES topped (MADE_TO_ORDER + hasToppings) products, which can no
 * longer open the topping panel on empty stock. An unsellable card is NOT
 * silently disabled: it stays clickable and, when clicked, emits `blocked`
 * (never `add`/`select`) so the parent can raise an alert telling the cashier
 * exactly what to do. It never enters the cart through any path:
 *   - `availableQty === 0 && expiredQty > 0` → "Kedaluwarsa — tidak bisa dijual"
 *   - `availableQty === 0 && expiredQty === 0` → "Stok habis"
 * The backend rejects those lines with SALES_ORDER.STOCK_EXPIRED /
 * INVENTORY.INSUFFICIENT_STOCK as the safety net behind this grid rule.
 */
import { computed } from 'vue'
import { Search, Plus } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { formatRupiah } from '@/lib/format'
import type { PosProduct } from '@/services/sales.service'

const props = defineProps<{
  products: PosProduct[]
  loading: boolean
  errorMessage: string | null
  search: string
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'select', product: PosProduct): void
  (event: 'add', product: PosProduct): void
  (event: 'blocked', payload: { product: PosProduct; reason: UnsellableReason }): void
}>()

/** Why a card cannot be sold. `null` when it can. */
type UnsellableReason = 'EXPIRED' | 'OUT_OF_STOCK'

const REASON_LABELS: Record<UnsellableReason, string> = {
  EXPIRED: 'Kedaluwarsa — tidak bisa dijual',
  OUT_OF_STOCK: 'Stok habis',
}

/** A product accepts toppings → its topped lines open the modifier panel. */
function acceptsToppings(product: PosProduct): boolean {
  return product.saleMode === 'MADE_TO_ORDER' && product.hasToppings
}

/**
 * Stock-first: a product is sellable ONLY when it has sellable stock on hand.
 * This now INCLUDES topped products — POS never backflushes, so a topped line
 * also needs stock put there by a Production Order first.
 */
function isSellable(product: PosProduct): boolean {
  return product.availableQty > 0
}

/**
 * `null` when the card is sellable; otherwise the reason it is blocked.
 * A backend that has not shipped `expiredQty` yet yields `undefined > 0 ===
 * false`, which degrades to "Stok habis" — never to a falsely sellable card.
 */
function unsellableReason(product: PosProduct): UnsellableReason | null {
  if (isSellable(product)) {
    return null
  }
  return product.expiredQty > 0 ? 'EXPIRED' : 'OUT_OF_STOCK'
}

/** Product + its resolved availability, computed once per render. */
interface ProductCard {
  product: PosProduct
  sellable: boolean
  reason: UnsellableReason | null
  reasonLabel: string | null
}

const cards = computed<ProductCard[]>(() =>
  props.products.map((product) => {
    const reason = unsellableReason(product)
    return {
      product,
      sellable: reason === null,
      reason,
      reasonLabel: reason ? REASON_LABELS[reason] : null,
    }
  }),
)

function onCardClick(product: PosProduct): void {
  const reason = unsellableReason(product)
  if (reason !== null) {
    // Unsellable cards are clickable so the cashier gets an explicit alert, but
    // they NEVER enter the cart or open the topping panel. This guard is the
    // single enforcement point for mouse, keyboard, and programmatic clicks.
    emit('blocked', { product, reason })
    return
  }
  if (acceptsToppings(product)) {
    emit('select', product)
  } else {
    emit('add', product)
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="relative mb-4">
      <Search
        class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
      <input
        :value="props.search"
        type="text"
        placeholder="Cari produk..."
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent ps-10 pe-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div v-if="props.loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      Memuat produk...
    </div>

    <div
      v-else-if="props.errorMessage"
      class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ props.errorMessage }}
    </div>

    <div
      v-else-if="props.products.length === 0"
      class="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700"
    >
      <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada produk</p>
      <p class="mt-1 text-theme-sm text-gray-400 dark:text-gray-500">
        Belum ada produk jual untuk outlet ini.
      </p>
    </div>

    <div v-else class="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
      <button
        v-for="card in cards"
        :key="card.product.productId"
        type="button"
        :title="card.reasonLabel ?? undefined"
        class="group flex flex-col rounded-2xl border p-4 text-start transition"
        :class="
          card.sellable
            ? 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/50'
            : 'cursor-pointer border-gray-200 bg-gray-50 hover:border-error-300 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-error-500/40'
        "
        @click="onCardClick(card.product)"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <Badge v-if="acceptsToppings(card.product)" size="sm" color="info">
            Bisa ditambah topping
          </Badge>
          <span
            v-if="card.sellable"
            class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-500 opacity-0 transition group-hover:opacity-100 dark:bg-brand-500/15 dark:text-brand-400"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {{ card.product.name }}
        </span>
        <span class="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">{{
          card.product.sku
        }}</span>
        <span class="mt-2 text-base font-semibold text-brand-600 dark:text-brand-400">
          {{ formatRupiah(card.product.sellingPrice) }}
        </span>

        <!-- Availability: sellable stock, or the reason the card is disabled.
             Every state is spelled out in text — colour is only a reinforcement. -->
        <span
          v-if="card.product.availableQty > 0"
          class="mt-1 text-theme-xs text-success-600 dark:text-success-500"
        >
          Stok: {{ card.product.availableQty }}
        </span>
        <Badge
          v-else-if="card.reason"
          size="sm"
          :color="card.reason === 'EXPIRED' ? 'error' : 'light'"
        >
          {{ card.reasonLabel }}
        </Badge>
      </button>
    </div>
  </div>
</template>
