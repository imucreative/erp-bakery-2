<script setup lang="ts">
/**
 * UomTable — presentational table for the UOM list. Emits edit/delete intents
 * to the parent; renders loading / error / empty states. Row actions are
 * compact icon-only buttons (aria-label + title for accessibility/tooltip) to
 * keep the table dense.
 */
import { computed } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { Uom } from '@/services/uom.service'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

const props = withDefaults(
  defineProps<{
    items: Uom[]
    dimensions?: UomDimensionDefinition[]
    loading: boolean
    errorMessage: string | null
    canManage: boolean
  }>(),
  { dimensions: () => [] },
)

defineEmits<{
  (event: 'edit', uom: Uom): void
  (event: 'delete', uom: Uom): void
}>()

const dimensionMap = computed<Map<string, UomDimensionDefinition>>(
  () => new Map(props.dimensions.map((item) => [item.code, item])),
)

const factorFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 })

function formatFactor(value: number | null): string {
  return value === null ? '—' : factorFormatter.format(value)
}

function dimensionLabel(code: string | null): string {
  if (!code) {
    return 'Belum diset'
  }
  return dimensionMap.value.get(code)?.name ?? code
}

function canonicalLabel(code: string): string {
  const definition = dimensionMap.value.get(code)
  return definition ? `${definition.canonicalUnitName} (${definition.canonicalUnitSymbol})` : code
}

function equivalent(uom: Uom): string {
  if (!uom.dimension || uom.factorToCanonical === null) {
    return 'Belum diset'
  }
  return `1 ${uom.name} = ${formatFactor(uom.factorToCanonical)} ${canonicalLabel(uom.dimension)}`
}
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada satuan ukur."
    aria-label="Daftar satuan ukur"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Dimensi</BaseTableHead>
        <BaseTableHead align="end">Faktor</BaseTableHead>
        <BaseTableHead>Ekuivalen</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="uom in items" :key="uom.id">
        <BaseTableCell emphasis="medium">{{ uom.name }}</BaseTableCell>
        <BaseTableCell>
          <span v-if="uom.dimension">{{ dimensionLabel(uom.dimension) }}</span>
          <span v-else class="text-muted">Belum diset</span>
        </BaseTableCell>
        <BaseTableCell align="end">{{ formatFactor(uom.factorToCanonical) }}</BaseTableCell>
        <BaseTableCell>
          <span :class="uom.dimension && uom.factorToCanonical !== null ? '' : 'text-muted'">
            {{ equivalent(uom) }}
          </span>
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="uom.isActive ? 'success' : 'error'">
            {{ uom.isActive ? 'Aktif' : 'Nonaktif' }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <div class="flex items-center justify-end gap-2">
            <BaseButton
              v-if="canManage"
              size="sm"
              variant="outline"
              icon-only
              aria-label="Edit"
              title="Edit"
              @click="$emit('edit', uom)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <BaseButton
              v-if="canManage"
              size="sm"
              variant="danger"
              icon-only
              aria-label="Hapus"
              title="Hapus"
              @click="$emit('delete', uom)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <span v-if="!canManage" class="text-muted-xs"> — </span>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
