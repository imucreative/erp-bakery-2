<script setup lang="ts">
/**
 * RoleFormModal — create/edit modal for a role (ADR 49). CREATE captures
 * code (uppercase) + name + optional description + permission set. EDIT keeps
 * `code` read-only (immutable) and edits name/description/permissions, seeding
 * the picker from the loaded RoleDetail. Permissions are FULL-replaced on
 * submit. Self-contained form state; emits `submit`, parent runs the mutation.
 * Backdrop, Esc-close, and panel chrome come from BaseModal (wide body for the
 * picker). OWNER guardrail is delegated to RolePermissionPicker (role.manage
 * forced checked+disabled).
 */
import { computed, ref, watch } from 'vue'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseTextarea,
} from '@/components/ui'
import { Save, X } from 'lucide-vue-next'
import RolePermissionPicker from './RolePermissionPicker.vue'
import { usePermissions } from '@/composables/usePermissions'
import type { Role, RoleDetail } from '@/services/role.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    /** Row role (name/code shown immediately on edit). */
    role?: Role | null
    /** Loaded detail with permission codes (edit seed source). */
    detail?: RoleDetail | null
    detailLoading?: boolean
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  {
    role: null,
    detail: null,
    detailLoading: false,
    submitting: false,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  (event: 'close'): void
  (
    event: 'submit',
    payload: { code: string; name: string; description: string; permissions: string[] },
  ): void
}>()

const {
  permissions,
  loading: catalogLoading,
  errorMessage: catalogError,
  fetchCatalog,
} = usePermissions()

const code = ref<string>('')
const name = ref<string>('')
const description = ref<string>('')
const selectedPermissions = ref<string[]>([])
const localError = ref<string | null>(null)

const isOwner = computed<boolean>(() => (props.role?.code ?? props.detail?.code) === 'OWNER')
const isEdit = computed<boolean>(() => props.mode === 'edit')

function resetForm(): void {
  code.value = props.role?.code ?? ''
  name.value = props.role?.name ?? ''
  description.value = props.role?.description ?? ''
  selectedPermissions.value = []
  localError.value = null
}

// Seed permissions from the loaded detail (edit) as it arrives.
watch(
  () => props.detail,
  (detail) => {
    if (props.open && isEdit.value && detail) {
      selectedPermissions.value = [...detail.permissions]
      name.value = detail.name
      description.value = detail.description ?? ''
      code.value = detail.code
    }
  },
)

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetForm()
      void fetchCatalog()
      if (isEdit.value && props.detail) {
        selectedPermissions.value = [...props.detail.permissions]
      }
    }
  },
  { immediate: true },
)

function onSubmit(): void {
  const trimmedName = name.value.trim()
  if (trimmedName.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
  if (props.mode === 'create' && code.value.trim().length === 0) {
    localError.value = 'Kode wajib diisi.'
    return
  }
  localError.value = null
  emit('submit', {
    code: code.value.trim().toUpperCase(),
    name: trimmedName,
    description: description.value.trim(),
    permissions: [...selectedPermissions.value],
  })
}
</script>

<template>
  <BaseModal :open="open" size="2xl" scrollable @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ isEdit ? 'Edit Role' : 'Tambah Role' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="field-grid">
        <BaseFormField label="Kode" field-id="role-code" :required="!isEdit">
          <BaseInput
            v-if="isEdit"
            id="role-code"
            v-model="code"
            readonly
            aria-label="Kode role (tidak dapat diubah)"
          />
          <BaseInput
            v-else
            id="role-code"
            v-model="code"
            placeholder="mis. GUDANG"
            class="uppercase"
          />
          <p v-if="isEdit" class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
            Kode tidak dapat diubah.
          </p>
        </BaseFormField>
        <BaseFormField label="Nama" field-id="role-name" required>
          <BaseInput id="role-name" v-model="name" placeholder="mis. Staf Gudang" />
        </BaseFormField>
      </div>

      <BaseFormField label="Deskripsi" field-id="role-description">
        <BaseTextarea
          id="role-description"
          v-model="description"
          :rows="2"
          placeholder="Deskripsi singkat peran"
        />
      </BaseFormField>

      <div v-if="isEdit && detailLoading" class="text-muted py-4 text-center">
        Memuat permission role...
      </div>
      <RolePermissionPicker
        v-else
        v-model="selectedPermissions"
        :catalog="permissions"
        :is-owner="isOwner"
        :loading="catalogLoading"
        :error-message="catalogError"
      />

      <BaseAlert :message="localError || errorMessage" size="sm" />

      <div class="button-row pt-2">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
          <template #start-icon><X class="h-4 w-4" aria-hidden="true" /></template>
          Batal
        </BaseButton>
        <BaseButton
          type="submit"
          variant="success"
          :loading="submitting"
          loading-text="Menyimpan..."
        >
          <template #start-icon><Save class="h-4 w-4" aria-hidden="true" /></template>
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
