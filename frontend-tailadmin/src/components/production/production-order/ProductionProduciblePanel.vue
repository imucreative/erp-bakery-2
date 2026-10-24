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
import { BaseAlert, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
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
  props.info ? (props.info.recipe.yieldUomName ?? '') : '',
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
      <h4 class="section-title">Kapasitas Produksi</h4>
    </div>

    <!-- Loading -->
    <div v-if="props.loading" class="text-muted py-6 text-center">
      Menghitung kapasitas produksi...
    </div>

    <!-- No active recipe (404 RECIPE.NO_ACTIVE_RECIPE) -->
    <BaseAlert
      v-else-if="props.recipeMissing"
      variant="warning"
      size="sm"
      class="dark:text-orange-400"
    >
      Produk ini belum punya resep aktif. Produksi akan ditolak hingga resep aktif tersedia.
    </BaseAlert>

    <!-- Other error -->
    <BaseAlert v-else-if="props.error" :message="props.error" size="sm" />

    <!-- Loaded info -->
    <div v-else-if="props.info" class="space-y-4">
      <!-- Recipe + max producible -->
      <div class="field-grid">
        <div>
          <p class="text-meta uppercase">Resep Aktif</p>
          <p class="mt-1 text-strong">
            {{ props.info.recipe.name }}
            <span class="font-normal text-gray-400">({{ props.info.recipe.recipeNumber }})</span>
          </p>
        </div>
        <div>
          <p class="text-meta uppercase">Maks. Bisa Diproduksi</p>
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
            <span class="text-muted">{{ yieldUomLabel }}</span>
          </p>
        </div>
      </div>

      <!-- Out-of-stock warning -->
      <BaseAlert v-if="!hasStock" variant="warning" size="sm" class="dark:text-orange-400">
        <template #icon>
          <AlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
        </template>
        Stok bahan tidak cukup untuk produksi.
      </BaseAlert>

      <!-- Ingredient table -->
      <div>
        <p class="mb-2 text-meta uppercase">Daftar Bahan</p>
        <BaseTable aria-label="Kapasitas bahan produksi">
          <template #header>
            <BaseTableRow variant="header">
              <BaseTableHead>Bahan</BaseTableHead>
              <BaseTableHead align="end">Kebutuhan / Unit</BaseTableHead>
              <BaseTableHead align="end">Sisa Stok</BaseTableHead>
              <BaseTableHead align="end">Status</BaseTableHead>
            </BaseTableRow>
          </template>
          <template #body>
            <BaseTableRow v-for="item in props.info.items" :key="item.ingredientProductId">
              <BaseTableCell emphasis="medium">
                {{ item.ingredientProductName || item.ingredientProductId }}
              </BaseTableCell>
              <BaseTableCell align="end">
                {{ formatNumber(item.requiredPerUnit) }}
                <span class="text-gray-400">{{ item.uomName || item.uomId }}</span>
              </BaseTableCell>
              <BaseTableCell
                align="end"
                :class="[
                  item.isLimiting
                    ? 'font-medium text-warning-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-300',
                ]"
              >
                {{ formatNumber(item.availableQty) }}
                <span class="text-gray-400">{{ item.uomName || item.uomId }}</span>
              </BaseTableCell>
              <BaseTableCell align="end">
                <Badge v-if="item.isLimiting" variant="light" color="warning" size="sm">
                  Pembatas
                </Badge>
                <span v-else class="text-muted-xs">—</span>
              </BaseTableCell>
            </BaseTableRow>
            <BaseTableRow v-if="props.info.items.length === 0">
              <BaseTableCell colspan="4" align="center">
                Resep ini tidak memiliki bahan.
              </BaseTableCell>
            </BaseTableRow>
          </template>
        </BaseTable>
      </div>
    </div>

    <!-- Idle (no product+outlet selected yet) -->
    <p v-else class="text-muted py-6 text-center">
      Pilih produk jadi dan outlet untuk melihat kapasitas produksi.
    </p>
  </section>
</template>
