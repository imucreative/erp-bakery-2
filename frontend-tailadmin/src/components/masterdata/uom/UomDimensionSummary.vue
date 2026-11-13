<script setup lang="ts">
/**
 * UomDimensionSummary — dimension catalog strip for the UOM page: a card per
 * dimension with its canonical (smallest) unit and a colour-coded code badge,
 * or an empty-catalog panel with the CTA to create the first dimension. Pure
 * presentation; the parent owns the Kelola Dimensi drawer and the data fetch.
 */
import { Plus } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
import { dimensionBadgeColor } from '@/lib/dimensionBadge'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

defineProps<{
  dimensions: UomDimensionDefinition[]
  canManage: boolean
}>()

const emit = defineEmits<{
  (event: 'create'): void
}>()
</script>

<template>
  <div v-if="dimensions.length > 0" class="mb-4">
    <p class="text-meta mb-2">Dimensi dan satuan acuan</p>
    <div class="flex gap-3 overflow-x-auto pb-1">
      <div
        v-for="item in dimensions"
        :key="item.code"
        class="panel-card min-w-[190px] flex-shrink-0"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-strong">{{ item.name }}</p>
          <Badge v-if="!item.isActive" color="error">Nonaktif</Badge>
        </div>
        <p class="text-meta mt-1">
          Acuan: {{ item.canonicalUnitName }} ({{ item.canonicalUnitSymbol }})
        </p>
        <div class="mt-1.5">
          <Badge :color="dimensionBadgeColor(item.code)" size="sm">
            {{ item.code }}
          </Badge>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="panel-card mb-3">
    <p class="text-strong">Belum ada dimensi UOM</p>
    <p class="text-meta mt-1">
      Dimensi mengelompokkan satuan yang boleh saling dikonversi dan menentukan satuan terkecil
      (kanonik). Tambahkan dimensi terlebih dahulu sebelum membuat satuan.
    </p>
    <BaseButton v-if="canManage" size="sm" variant="primary" class="mt-3" @click="emit('create')">
      <template #start-icon>
        <Plus class="h-4 w-4" aria-hidden="true" />
      </template>
      Tambah dimensi pertama
    </BaseButton>
  </div>
</template>
