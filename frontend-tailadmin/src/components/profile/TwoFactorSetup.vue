<template>
  <div class="space-y-4">
    <p class="text-muted">
      Tambahkan akun ini di aplikasi authenticator memakai kunci berikut:
    </p>
    <div class="form-readonly font-mono break-all">{{ setup.secret }}</div>
    <p class="text-muted-xs break-all">{{ setup.otpauthUri }}</p>

    <RecoveryCodesPanel :codes="setup.recoveryCodes" />

    <div class="stack-row sm:items-end">
      <div class="w-full sm:max-w-xs">
        <BaseFormField label="Kode dari authenticator" field-id="two-factor-code" required>
          <BaseInput
            id="two-factor-code"
            :model-value="code"
            placeholder="123456"
            autocomplete="one-time-code"
            @update:model-value="emit('update:code', $event)"
          />
        </BaseFormField>
      </div>
      <BaseButton
        variant="primary"
        size="sm"
        :loading="loading"
        :disabled="!code"
        @click="emit('confirm')"
      >
        Konfirmasi &amp; aktifkan
      </BaseButton>
      <BaseButton variant="outline" size="sm" :disabled="loading" @click="emit('cancel')">
        Batal
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import RecoveryCodesPanel from './RecoveryCodesPanel.vue'
import type { TwoFactorSetup } from '@/services/auth.service'

/** Enrollment step: authenticator secret + recovery codes + confirmation code. */
defineProps<{
  setup: TwoFactorSetup
  code: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:code': [value: string]
  confirm: []
  cancel: []
}>()
</script>
