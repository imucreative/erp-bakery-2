<script setup lang="ts">
/**
 * ProductTable — presentational table for the product list. Resolves UOM name
 * via `uomNameById` and formats price/type. Compact icon-only row actions per
 * the master-module UI standard. Emits edit/delete; loading/error/empty states.
 */
import { Pencil, Trash2, Ruler } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { PRODUCT_TYPE_LABELS, type Product } from '@/services/product.service'

defineProps<{
  items: Product[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
  uomNameById: Record<string, string>
}>()

defineEmits<{
  (event: 'edit', product: Product): void
  (event: 'delete', product: Product): void
  (event: 'conversions', product: Product): void
}>()

function formatIdr(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada produk."
    aria-label="Daftar produk"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>SKU</BaseTableHead>
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Tipe</BaseTableHead>
        <BaseTableHead>UOM</BaseTableHead>
        <BaseTableHead align="end">Harga Jual</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="product in items" :key="product.id">
        <BaseTableCell emphasis="mono">{{ product.sku }}</BaseTableCell>
        <BaseTableCell emphasis="medium">{{ product.name }}</BaseTableCell>
        <BaseTableCell>{{
          PRODUCT_TYPE_LABELS[product.productType] ?? product.productType
        }}</BaseTableCell>
        <BaseTableCell>{{ uomNameById[product.uomId] || '—' }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">{{
          formatIdr(product.sellingPrice)
        }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="product.isActive ? 'success' : 'error'">
            {{ product.isActive ? 'Aktif' : 'Nonaktif' }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <div class="flex items-center justify-end gap-2">
            <BaseButton
              size="sm"
              variant="info"
              icon-only
              type="button"
              aria-label="Satuan & Konversi"
              title="Satuan & Konversi"
              @click="$emit('conversions', product)"
            >
              <Ruler class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <BaseButton
              v-if="canManage"
              size="sm"
              variant="outline"
              icon-only
              aria-label="Edit"
              title="Edit"
              @click="$emit('edit', product)"
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
              @click="$emit('delete', product)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
