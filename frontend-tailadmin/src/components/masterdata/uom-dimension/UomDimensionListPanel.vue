<script setup lang="ts">
/**
 * UomDimensionListPanel — list view inside the Kelola Dimensi drawer: search
 * toolbar, dimension table, and the read-only note for users without
 * `uom.manage`. Presentation only; the drawer owns data and mutations.
 */
import { Plus } from 'lucide-vue-next'
import { BaseButton, BaseInput } from '@/components/ui'
import UomDimensionTable from './UomDimensionTable.vue'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

defineProps<{
  items: UomDimensionDefinition[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
  search: string
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'create'): void
  (event: 'edit', dimension: UomDimensionDefinition): void
  (event: 'delete', dimension: UomDimensionDefinition): void
}>()
</script>

<template>
  <div class="toolbar-row">
    <div class="w-full sm:max-w-xs">
      <BaseInput
        id="uom-dimension-search"
        :model-value="search"
        placeholder="Cari kode, nama, atau satuan..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <BaseButton v-if="canManage" size="sm" variant="primary" @click="emit('create')">
      <template #start-icon>
        <Plus class="h-4 w-4" aria-hidden="true" />
      </template>
      Tambah Dimensi
    </BaseButton>
  </div>

  <UomDimensionTable
    :items="items"
    :loading="loading"
    :error-message="errorMessage"
    :can-manage="canManage"
    @edit="emit('edit', $event)"
    @delete="emit('delete', $event)"
  />

  <p v-if="!canManage" class="text-meta mt-3">
    Hanya pengguna dengan izin <span class="font-medium">uom.manage</span> yang dapat mengubah
    dimensi.
  </p>
</template>
