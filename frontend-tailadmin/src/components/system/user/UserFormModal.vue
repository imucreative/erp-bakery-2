<script setup lang="ts">
/**
 * UserFormModal — create/edit user.
 *   CREATE: name + email + password(min 8) + phone? + role (required) + outlets.
 *   EDIT: email read-only, no password; editable name/phone/role/active + outlets
 *     (full-sync). Outlet assignment via a toggle-switch list.
 * Backdrop, Esc-close, and panel chrome come from BaseModal.
 */
import { computed, ref, watch } from 'vue'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseToggle,
} from '@/components/ui'
import { Save, X } from 'lucide-vue-next'
import type { UserDetail } from '@/services/user.service'
import type { Role } from '@/services/role.service'
import type { Outlet } from '@/services/outlet.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    detail?: UserDetail | null
    detailLoading?: boolean
    roles: Role[]
    outlets: Outlet[]
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { detail: null, detailLoading: false, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit-create', payload: CreatePayload): void
  (event: 'submit-edit', payload: EditPayload): void
}>()

interface CreatePayload {
  name: string
  email: string
  password: string
  phone: string
  roleId: string
  outletIds: string[]
}
interface EditPayload {
  name: string
  phone: string
  roleId: string
  isActive: boolean
  outletIds: string[]
}

const isEdit = computed<boolean>(() => props.mode === 'edit')

const name = ref<string>('')
const email = ref<string>('')
const password = ref<string>('')
const phone = ref<string>('')
const roleId = ref<string>('')
const isActive = ref<boolean>(true)
const outletIds = ref<string[]>([])
const localError = ref<string | null>(null)

watch(
  () => [props.open, props.detail] as const,
  ([open]) => {
    if (open) {
      const d = props.detail
      name.value = d?.name ?? ''
      email.value = d?.email ?? ''
      password.value = ''
      phone.value = d?.phone ?? ''
      roleId.value = d?.roleId ?? ''
      isActive.value = d?.isActive ?? true
      outletIds.value = d?.outlets.map((o) => o.outletId) ?? []
      localError.value = null
    }
  },
  { immediate: true },
)

function toggleOutlet(id: string): void {
  const idx = outletIds.value.indexOf(id)
  if (idx >= 0) {
    outletIds.value = outletIds.value.filter((x) => x !== id)
  } else {
    outletIds.value = [...outletIds.value, id]
  }
}

const roleOptions = computed(() =>
  props.roles.map((role) => ({ label: role.name, value: role.id })),
)

function onSubmit(): void {
  if (name.value.trim().length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
  if (!roleId.value) {
    localError.value = 'Role wajib dipilih.'
    return
  }
  if (isEdit.value) {
    localError.value = null
    emit('submit-edit', {
      name: name.value.trim(),
      phone: phone.value.trim(),
      roleId: roleId.value,
      isActive: isActive.value,
      outletIds: outletIds.value,
    })
    return
  }
  // create validation
  const mail = email.value.trim()
  if (mail.length === 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    localError.value = 'Email tidak valid.'
    return
  }
  if (password.value.length < 8) {
    localError.value = 'Password minimal 8 karakter.'
    return
  }
  localError.value = null
  emit('submit-create', {
    name: name.value.trim(),
    email: mail,
    password: password.value,
    phone: phone.value.trim(),
    roleId: roleId.value,
    outletIds: outletIds.value,
  })
}
</script>

<template>
  <BaseModal :open="open" size="lg" scrollable @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ isEdit ? 'Edit User' : 'Tambah User' }}
    </h4>

    <div v-if="isEdit && detailLoading" class="text-muted py-8 text-center">
      Memuat data user...
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <BaseFormField label="Nama" field-id="user-name" required>
        <BaseInput id="user-name" v-model="name" placeholder="Nama lengkap" />
      </BaseFormField>

      <div class="field-grid">
        <BaseFormField label="Email" field-id="user-email" :required="!isEdit">
          <BaseInput
            v-if="!isEdit"
            id="user-email"
            v-model="email"
            type="email"
            placeholder="nama@company.com"
          />
          <p v-else class="form-readonly">{{ email }}</p>
        </BaseFormField>
        <BaseFormField label="Telepon" field-id="user-phone">
          <BaseInput id="user-phone" v-model="phone" type="tel" placeholder="0812-3456-7890" />
        </BaseFormField>
      </div>

      <BaseFormField v-if="!isEdit" label="Password" field-id="user-password" required>
        <BaseInput
          id="user-password"
          v-model="password"
          type="password"
          placeholder="Minimal 8 karakter"
          autocomplete="new-password"
        />
      </BaseFormField>

      <BaseFormField label="Role" field-id="user-role" required>
        <BaseSelect
          id="user-role"
          v-model="roleId"
          :options="roleOptions"
          placeholder="Pilih role"
        />
      </BaseFormField>

      <BaseFormField label="Akses Outlet" field-id="user-outlets">
        <div
          class="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-800"
        >
          <p v-if="outlets.length === 0" class="text-muted-xs">
            Tidak ada outlet tersedia.
          </p>
          <div
            v-for="o in outlets"
            :key="o.id"
            class="flex items-center justify-between gap-3 py-1 text-sm text-gray-700 dark:text-gray-300"
          >
            <span>
              {{ o.name }}
              <span class="font-mono text-theme-xs text-gray-400">({{ o.code }})</span>
            </span>
            <BaseToggle
              :model-value="outletIds.includes(o.id)"
              @update:model-value="toggleOutlet(o.id)"
            />
          </div>
        </div>
      </BaseFormField>

      <BaseToggle v-if="isEdit" v-model="isActive" label="Aktif" />

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
