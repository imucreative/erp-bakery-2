<script setup lang="ts">
/**
 * ProductGrid — POS product grid (left column). Renders a quick-search box and
 * product cards (name + price + sale-mode badge). Clicking a MADE_TO_ORDER
 * product that `hasToppings` emits `select` (parent opens the modifier panel
 * backed by the GLOBAL topping catalog); any other product (STOCK, or
 * made-to-order without toppings) emits `add` (straight to cart, no toppings).
 * Stateless: the parent owns the product list, loading/error, and the search
 * string (v-model:search).
 */
import { Search, Plus } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { formatRupiah } from '@/lib/format'
import {
  SALE_MODE_LABELS,
  saleModeBadgeColor,
  type PosProduct,
} from '@/services/sales.service'

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
}>()

function onCardClick(product: PosProduct): void {
  if (product.saleMode === 'MADE_TO_ORDER' && product.hasToppings) {
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

    <div
      v-else
      class="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4"
    >
      <button
        v-for="product in props.products"
        :key="product.productId"
        type="button"
        class="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 text-start transition hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/50"
        @click="onCardClick(product)"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <Badge size="sm" :color="saleModeBadgeColor(product.saleMode)">
            {{ SALE_MODE_LABELS[product.saleMode] }}
          </Badge>
          <span
            class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-500 opacity-0 transition group-hover:opacity-100 dark:bg-brand-500/15 dark:text-brand-400"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {{ product.name }}
        </span>
        <span class="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">{{ product.sku }}</span>
        <span class="mt-2 text-base font-semibold text-brand-600 dark:text-brand-400">
          {{ formatRupiah(product.sellingPrice) }}
        </span>
      </button>
    </div>
  </div>
</template>
