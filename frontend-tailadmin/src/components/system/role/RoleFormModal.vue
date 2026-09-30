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
import Button from '@/components/ui/Button.vue'
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

const { permissions, loading: catalogLoading, errorMessage: catalogError, fetchCatalog } =
  usePermissions()

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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const readonlyClass =
  'h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm font-mono text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

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
  <div v-if="open" class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4">
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ isEdit ? 'Edit Role' : 'Tambah Role' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">
              Kode<span v-if="!isEdit" class="text-error-500">*</span>
            </label>
            <input
              v-if="isEdit"
              :value="code"
              type="text"
              readonly
              :class="readonlyClass"
              aria-label="Kode role (tidak dapat diubah)"
            />
            <input
              v-else
              v-model="code"
              type="text"
              placeholder="mis. GUDANG"
              class="uppercase"
              :class="inputClass"
            />
            <p v-if="isEdit" class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Kode tidak dapat diubah.
            </p>
          </div>
          <div>
            <label :class="labelClass">Nama<span class="text-error-500">*</span></label>
            <input v-model="name" type="text" placeholder="mis. Staf Gudang" :class="inputClass" />
          </div>
        </div>

        <div>
          <label :class="labelClass">Deskripsi</label>
          <textarea
            v-model="description"
            rows="2"
            placeholder="Deskripsi singkat peran"
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>

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
          <Button size="sm" variant="outline" :disabled="submitting" :on-click="() => emit('close')">
            Batal
          </Button>
          <button
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
