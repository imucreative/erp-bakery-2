<script setup lang="ts">
/**
 * RecipeSummary — read-only header meta card for a Recipe. Renders the status
 * badge, finished product, version, yield (qty + UOM), ingredient count,
 * creation/update time and optional instructions. Pure presentation: resolves
 * product/UOM ids → names via injected resolver callbacks so it never fetches
 * or holds lookup state itself.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDateTime, formatNumber } from '@/lib/format'
import { RECIPE_STATUS_LABELS, statusBadgeColor, type Recipe } from '@/services/recipe.service'

const props = defineProps<{
  recipe: Recipe
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <dl class="field-grid">
    <div>
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.recipe.status)">
          {{ RECIPE_STATUS_LABELS[props.recipe.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Versi</dt>
      <dd class="mt-1 text-value">v{{ props.recipe.version }}</dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Produk Jadi</dt>
      <dd class="mt-1 text-value">
        {{ props.productName(props.recipe.productId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Hasil / Batch</dt>
      <dd class="mt-1 text-value">
        {{ formatNumber(props.recipe.yieldQty) }}
        {{ props.recipe.yieldUomName || props.uomName(props.recipe.yieldUomId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Jumlah Bahan</dt>
      <dd class="mt-1 text-value">
        {{ props.recipe.items.length }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.recipe.createdAt) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Diperbarui</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.recipe.updatedAt) }}
      </dd>
    </div>

    <div v-if="props.recipe.instructions" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Instruksi</dt>
      <dd class="mt-1 whitespace-pre-line text-body">
        {{ props.recipe.instructions }}
      </dd>
    </div>
  </dl>
</template>
