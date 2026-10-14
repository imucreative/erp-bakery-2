<script setup lang="ts">
/**
 * ProductionProduciblePanel — read-only "production capacity" info panel for the
 * instant-complete production form. Given a chosen finished product + outlet, the
 * parent fetches GET /production/producible and passes the result here. The panel
 * is purely informative (it never blocks submit — the backend remains the
 * authority) and surfaces:
 *
 *  - the resolved ACTIVE recipe (name + number),
 *  - the max producible finished units (prominent) in the recipe yield UOM, with
 *    an out-of-stock warning when it is 0,
 *  - a small read-only ingredient table: name, required-per-unit, available
 *    stock, and a "pembatas" (limiting) badge on the constraining ingredient(s).
 *
 * Stateless view: all data (loading/error/info) flows via
 * props so the parent form owns state, fetching and debouncing. Ingredient names
 * and units are part of the scoped production-capacity response.
 */
import { computed } from 'vue'
import { AlertTriangle, PackageCheck } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { formatNumber } from '@/lib/format'
import type { ProducibleInfo } from '@/services/production-order.service'

const props = defineProps<{
  /** Producible preview for the chosen product+outlet, null when not loaded. */
  info: ProducibleInfo | null
  /** True while the preview request is in flight. */
  loading: boolean
  /** True when the chosen product has no ACTIVE recipe (404). */
  recipeMissing: boolean
  /** Any other error message surfaced from the preview request. */
  error: string | null
}>()

const yieldUomLabel = computed<string>(() =>
  props.info ? props.info.recipe.yieldUomName ?? '' : '',
)

const hasStock = computed<boolean>(() => (props.info?.producibleQty ?? 0) > 0)
</script>

<template>
  <section
    class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]"
    aria-label="Informasi kapasitas produksi"
  >
    <div class="mb-3 flex items-center gap-2">
      <PackageCheck class="h-4 w-4 text-brand-500 dark:text-brand-400" aria-hidden="true" />
      <h4 class="text-sm font-semibold text-gray-800 dark:text-white/90">Kapasitas Produksi</h4>
    </div>

    <!-- Loading -->
    <div
      v-if="props.loading"
      class="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
    >
      Menghitung kapasitas produksi...
    </div>

    <!-- No active recipe (404 RECIPE.NO_ACTIVE_RECIPE) -->
    <p
      v-else-if="props.recipeMissing"
      class="rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-theme-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      role="alert"
    >
      Produk ini belum punya resep aktif. Produksi akan ditolak hingga resep aktif tersedia.
    </p>

    <!-- Other error -->
    <p
      v-else-if="props.error"
      class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ props.error }}
    </p>

    <!-- Loaded info -->
    <div v-else-if="props.info" class="space-y-4">
      <!-- Recipe + max producible -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">Resep Aktif</p>
          <p class="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {{ props.info.recipe.name }}
            <span class="font-normal text-gray-400">({{ props.info.recipe.recipeNumber }})</span>
          </p>
        </div>
        <div>
          <p class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            Maks. Bisa Diproduksi
          </p>
          <p class="mt-1 flex items-baseline gap-1.5">
            <span
              :class="[
                'text-title-sm font-bold',
                hasStock
                  ? 'text-gray-800 dark:text-white/90'
                  : 'text-error-600 dark:text-error-400',
              ]"
            >
              {{ formatNumber(props.info.producibleQty) }}
            </span>
            <span class="text-theme-sm text-gray-500 dark:text-gray-400">{{ yieldUomLabel }}</span>
          </p>
        </div>
      </div>

      <!-- Out-of-stock warning -->
      <p
        v-if="!hasStock"
        class="flex items-center gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-theme-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        role="alert"
      >
        <AlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
        Stok bahan tidak cukup untuk produksi.
      </p>

      <!-- Ingredient table -->
      <div>
        <p class="mb-2 text-theme-xs uppercase text-gray-500 dark:text-gray-400">Daftar Bahan</p>
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table class="min-w-full">
            <thead>
              <tr
                class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
              >
                <th
                  class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Bahan
                </th>
                <th
                  class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Kebutuhan / Unit
                </th>
                <th
                  class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Sisa Stok
                </th>
                <th
                  class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in props.info.items"
                :key="item.ingredientProductId"
                class="border-b border-gray-100 last:border-0 dark:border-gray-800"
              >
                <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
                  {{ item.ingredientProductName || item.ingredientProductId }}
                </td>
                <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
                  {{ formatNumber(item.requiredPerUnit) }}
                  <span class="text-gray-400">{{ item.uomName || item.uomId }}</span>
                </td>
                <td
                  :class="[
                    'px-4 py-3 text-end text-theme-sm',
                    item.isLimiting
                      ? 'font-medium text-warning-600 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-300',
                  ]"
                >
                  {{ formatNumber(item.availableQty) }}
                  <span class="text-gray-400">{{ item.uomName || item.uomId }}</span>
                </td>
                <td class="px-4 py-3 text-end">
                  <Badge v-if="item.isLimiting" variant="light" color="warning" size="sm">
                    Pembatas
                  </Badge>
                  <span v-else class="text-theme-xs text-gray-400 dark:text-gray-500">—</span>
                </td>
              </tr>
              <tr v-if="props.info.items.length === 0">
                <td
                  colspan="4"
                  class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                >
                  Resep ini tidak memiliki bahan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Idle (no product+outlet selected yet) -->
    <p v-else class="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
      Pilih produk jadi dan outlet untuk melihat kapasitas produksi.
    </p>
  </section>
</template>
