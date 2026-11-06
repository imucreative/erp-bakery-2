<script setup lang="ts">
import { computed } from 'vue'
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  PasswordInput,
  BaseSelect,
  BaseToggle,
} from '@/components/ui'
import type { PlatformUserItem } from '@/services/platform.service'
import {
  usePlatformUserForm,
  type PlatformUserFormPayload,
} from '@/composables/usePlatformUserForm'

export type { PlatformUserFormPayload }

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    user?: PlatformUserItem | null
    companies: Array<{ label: string; value: string }>
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { user: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', payload: PlatformUserFormPayload): void
}>()

const { form, roles, localError, loadingRoles, errors, submit, passwordPolicyHint } =
  usePlatformUserForm(props, (payload) => emit('submit', payload))
const isEdit = computed(() => props.mode === 'edit')
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ isEdit ? 'Edit User' : 'Tambah User Platform' }}
    </h4>

    <form class="space-y-4" @submit.prevent="submit">
      <div class="field-grid">
        <BaseFormField label="Nama" field-id="platform-user-name" required :error="errors.name">
          <BaseInput id="platform-user-name" v-model="form.name" placeholder="Nama lengkap" />
        </BaseFormField>
        <BaseFormField label="Email" field-id="platform-user-email" required :error="errors.email">
          <BaseInput
            id="platform-user-email"
            v-model="form.email"
            type="email"
            placeholder="Alamat email"
            :disabled="isEdit"
            :error="errors.email"
          />
        </BaseFormField>
      </div>

      <BaseFormField label="Telepon" field-id="platform-user-phone" :error="errors.phone">
        <BaseInput
          id="platform-user-phone"
          v-model="form.phone"
          placeholder="Nomor telepon"
          :error="errors.phone"
        />
      </BaseFormField>

      <BaseFormField
        v-if="!isEdit"
        label="Password"
        field-id="platform-user-password"
        required
        :error="errors.password"
        :hint="passwordPolicyHint"
      >
        <PasswordInput
          id="platform-user-password"
          v-model="form.password"
          autocomplete="new-password"
          placeholder="Password"
          :error="errors.password"
        />
      </BaseFormField>

      <div class="field-grid">
        <BaseFormField
          label="Company"
          field-id="platform-user-company"
          required
          :error="errors.companyId"
        >
          <BaseSelect
            id="platform-user-company"
            v-model="form.companyId"
            :options="companies"
            placeholder="Pilih company"
            :error="errors.companyId"
          />
        </BaseFormField>
        <BaseFormField label="Role" field-id="platform-user-role" required :error="errors.roleId">
          <BaseSelect
            id="platform-user-role"
            v-model="form.roleId"
            :options="roles"
            placeholder="Pilih role"
            :disabled="loadingRoles || !form.companyId"
            :error="errors.roleId"
          />
        </BaseFormField>
      </div>

      <BaseAlert :message="localError || errorMessage" size="sm" />

      <BaseToggle v-if="isEdit" v-model="form.isActive" label="Aktif" />

      <div class="button-row pt-2">
        <BaseButton
          size="sm"
          variant="outline"
          type="button"
          :disabled="submitting"
          @click="emit('close')"
        >
          <template #start-icon>
            <X class="h-4 w-4" aria-hidden="true" />
          </template>
          Batal
        </BaseButton>
        <BaseButton
          type="submit"
          variant="success"
          :loading="submitting"
          :disabled="submitting"
          loading-text="Menyimpan..."
        >
          <template #start-icon>
            <Save class="h-4 w-4" aria-hidden="true" />
          </template>
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
