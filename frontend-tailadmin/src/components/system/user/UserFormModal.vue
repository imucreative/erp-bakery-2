<script setup lang="ts">
/**
 * UserFormModal — create/edit user.
 *   CREATE: name + email + password(min 8) + phone? + role (required) + outlets.
 *   EDIT: email read-only, no password; editable name/phone/role/active + outlets
 *     (full-sync). Outlet assignment via a checkbox list.
 * Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

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
  <div v-if="open" class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4">
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ isEdit ? 'Edit User' : 'Tambah User' }}
      </h4>

      <div v-if="isEdit && detailLoading" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Memuat data user...
      </div>

      <form v-else class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label :class="labelClass">Nama<span class="text-error-500">*</span></label>
          <input v-model="name" type="text" placeholder="Nama lengkap" :class="inputClass" />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Email<span v-if="!isEdit" class="text-error-500">*</span></label>
            <input v-if="!isEdit" v-model="email" type="email" placeholder="nama@company.com" :class="inputClass" />
            <p v-else class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
              {{ email }}
            </p>
          </div>
          <div>
            <label :class="labelClass">Telepon</label>
            <input v-model="phone" type="text" placeholder="0812-3456-7890" :class="inputClass" />
          </div>
        </div>

        <div v-if="!isEdit">
          <label :class="labelClass">Password<span class="text-error-500">*</span></label>
          <input v-model="password" type="password" placeholder="Minimal 8 karakter" autocomplete="new-password" :class="inputClass" />
        </div>

        <div>
          <label :class="labelClass">Role<span class="text-error-500">*</span></label>
          <select v-model="roleId" :class="[inputClass, 'appearance-none']">
            <option value="" disabled>Pilih role</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>

        <div>
          <label :class="labelClass">Akses Outlet</label>
          <div class="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p v-if="outlets.length === 0" class="text-theme-xs text-gray-400 dark:text-gray-500">
              Tidak ada outlet tersedia.
            </p>
            <label
              v-for="o in outlets"
              :key="o.id"
              class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input
                type="checkbox"
                class="h-4 w-4 rounded"
                :checked="outletIds.includes(o.id)"
                @change="toggleOutlet(o.id)"
              />
              {{ o.name }} <span class="font-mono text-theme-xs text-gray-400">({{ o.code }})</span>
            </label>
          </div>
        </div>

        <label
          v-if="isEdit"
          class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-400"
        >
          <input v-model="isActive" type="checkbox" class="h-4 w-4 rounded" />
          Aktif
        </label>

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
