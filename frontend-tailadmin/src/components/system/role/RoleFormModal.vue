<script setup lang="ts">
/**
 * RoleFormModal — create/edit modal for a role (ADR 49). CREATE captures
 * code (uppercase) + name + optional description + permission set. EDIT keeps
 * `code` read-only (immutable) and edits name/description/permissions, seeding
 * the picker from the loaded RoleDetail. Permissions are FULL-replaced on
 * submit. Self-contained form state; emits `submit`, parent runs the mutation.
 * Transparent backdrop, wide body for the picker. OWNER guardrail is delegated
 * to RolePermissionPicker (role.manage forced checked+disabled).
 */
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseFormField, BaseInput, BaseTextarea } from '@/components/ui'
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
  <div
    v-if="open"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ isEdit ? 'Edit Role' : 'Tambah Role' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div
          v-if="isEdit && detailLoading"
          class="py-4 text-center text-sm text-gray-500 dark:text-gray-400"
        >
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

        <p
          v-if="localError || errorMessage"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ localError || errorMessage }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
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
    </div>
  </div>
</template>
