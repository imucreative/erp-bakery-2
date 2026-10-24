<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { RECIPE_STATUS_LABELS, statusBadgeColor, type Recipe } from '@/services/recipe.service'
defineProps<{ items: Recipe[]; loading: boolean; errorMessage: string | null }>()
defineEmits<{ (event: 'view', recipe: Recipe): void }>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada resep."
    aria-label="Daftar resep"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nomor</BaseTableHead>
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Produk Jadi</BaseTableHead>
        <BaseTableHead align="end">Versi</BaseTableHead>
        <BaseTableHead align="end">Jumlah Bahan</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="recipe in items" :key="recipe.id">
        <BaseTableCell emphasis="medium">{{ recipe.recipeNumber }}</BaseTableCell>
        <BaseTableCell emphasis="medium">{{ recipe.name }}</BaseTableCell>
        <BaseTableCell>{{ recipe.productName || recipe.productId }}</BaseTableCell>
        <BaseTableCell align="end">v{{ recipe.version }}</BaseTableCell>
        <BaseTableCell align="end">{{ recipe.items.length }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusBadgeColor(recipe.status)">
            {{ RECIPE_STATUS_LABELS[recipe.status] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <BaseButton
            size="sm"
            variant="outline"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', recipe)"
          >
            <Eye class="h-4 w-4" aria-hidden="true" />
          </BaseButton>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
