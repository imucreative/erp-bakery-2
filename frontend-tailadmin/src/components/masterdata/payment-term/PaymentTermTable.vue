<script setup lang="ts">
/**
 * PaymentTermTable — presentational table for the payment term list. Row
 * actions are compact icon-only buttons (aria-label + title) per the
 * master-module UI standard. Emits edit/delete; renders loading / error /
 * empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { PaymentTerm } from '@/services/payment-term.service'

defineProps<{
  items: PaymentTerm[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', paymentTerm: PaymentTerm): void
  (event: 'delete', paymentTerm: PaymentTerm): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada payment term."
    aria-label="Daftar payment term"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Kode</BaseTableHead>
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Jatuh Tempo</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="paymentTerm in items" :key="paymentTerm.id">
        <BaseTableCell emphasis="medium">{{ paymentTerm.code }}</BaseTableCell>
        <BaseTableCell>{{ paymentTerm.name }}</BaseTableCell>
        <BaseTableCell>{{ paymentTerm.dueDays }} hari</BaseTableCell>
        <BaseTableCell>
          <Badge :color="paymentTerm.isActive ? 'success' : 'error'">
            {{ paymentTerm.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', paymentTerm)"
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
              @click="$emit('delete', paymentTerm)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <span v-if="!canManage" class="text-theme-xs text-gray-400 dark:text-gray-500">
              —
            </span>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
