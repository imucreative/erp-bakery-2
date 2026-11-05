<template>
  <div v-for="field in fields" :key="field.key" :class="field.full ? 'col-span-2' : ''">
    <BaseFormField
      :label="field.label"
      :field-id="field.key"
      :required="field.required"
      :error="errors?.[field.key]"
    >
      <BaseInput
        :id="field.key"
        :model-value="modelValue[field.key] ?? ''"
        :placeholder="field.placeholder"
        :type="field.type ?? 'text'"
        :error="errors?.[field.key] || undefined"
        @update:model-value="update(field.key, $event)"
      />
    </BaseFormField>
  </div>
</template>

<script setup lang="ts">
import { BaseFormField, BaseInput } from '@/components/ui'

/**
 * ProfileFieldEditor — pasangan `ProfileFieldGrid` untuk mode edit: menerima
 * konfigurasi field lalu mencetak input-nya, sehingga form dengan banyak field
 * tidak perlu menulis blok BaseFormField berulang.
 *
 * Dipasang di dalam kisi `ProfileEditModal` (yang menangani judul, tombol, dan
 * grid-nya); `full: true` membuat satu field memakai lebar penuh.
 */
/** Tipe input yang didukung BaseInput (dipakai field `type`). */
export type ProfileEditInputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'

export interface ProfileEditField {
  /** Kunci pada objek nilai + dipakai sebagai id input. */
  key: string
  label: string
  placeholder?: string
  required?: boolean
  /** true = memakai lebar penuh (col-span-2) di kisi dua kolom. */
  full?: boolean
  type?: ProfileEditInputType
}

const props = defineProps<{
  /** Konfigurasi field yang ditampilkan, berurutan. */
  fields: ProfileEditField[]
  /** Nilai form; diubah lewat `update:modelValue`. */
  modelValue: Record<string, string>
  /** Pesan error per `key` (opsional). */
  errors?: Record<string, string | null>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

function update(key: string, value: string): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
