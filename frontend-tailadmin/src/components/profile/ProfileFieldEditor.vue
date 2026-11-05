<template>
  <div v-for="field in fields" :key="field.key" :class="field.full ? 'col-span-2' : ''">
    <BaseFormField
      :label="field.label"
      :field-id="field.key"
      :required="field.required"
      :hint="field.hint"
      :error="errors?.[field.key]"
    >
      <PasswordInput
        v-if="field.type === 'password'"
        :id="field.key"
        :model-value="form[field.key] ?? ''"
        :placeholder="field.placeholder"
        :error="errors?.[field.key]"
        @update:model-value="update(field.key, $event)"
      />
      <BaseInput
        v-else
        :id="field.key"
        :model-value="form[field.key] ?? ''"
        :placeholder="field.placeholder"
        :type="field.type ?? 'text'"
        :error="errors?.[field.key] || undefined"
        @update:model-value="update(field.key, $event)"
      />
    </BaseFormField>
  </div>
</template>

<script setup lang="ts">
import { BaseFormField, BaseInput, PasswordInput } from '@/components/ui'

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
  /** Kunci pada objek form + dipakai sebagai id input. */
  key: string
  label: string
  placeholder?: string
  required?: boolean
  /** Teks bantuan di bawah input (mis. kebijakan password). */
  hint?: string
  /** true = memakai lebar penuh (col-span-2) di kisi dua kolom. */
  full?: boolean
  type?: ProfileEditInputType
}

/**
 * ProfileFieldEditor — pasangan `ProfileFieldGrid` untuk mode edit: menerima
 * konfigurasi field lalu mencetak input-nya, sehingga form dengan banyak field tidak
 * perlu menulis blok BaseFormField berulang.
 *
 * `form` adalah objek reaktif milik pemanggil dan **diubah langsung** (di-mutasi) saat
 * input berubah — sengaja TIDAK memakai `v-model` yang mengganti objeknya, karena
 * pemanggil menyimpan form sebagai `reactive({...})` di variabel `const`: menugaskan
 * objek baru (`form = $event`) akan gagal dan membuat isian tidak pernah tersimpan.
 *
 * Dipasang di dalam kisi `ProfileEditModal` (yang menangani judul, tombol, dan
 * grid-nya); `full: true` membuat satu field memakai lebar penuh.
 */
const props = defineProps<{
  /** Konfigurasi field yang ditampilkan, berurutan. */
  fields: ProfileEditField[]
  /** Objek form milik pemanggil; nilainya diubah langsung oleh editor ini. */
  form: Record<string, string>
  /** Pesan error per `key` (opsional). */
  errors?: Record<string, string | null>
}>()

function update(key: string, value: string): void {
  props.form[key] = value
}
</script>
