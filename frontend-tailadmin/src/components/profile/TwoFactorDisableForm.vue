<template>
  <div class="space-y-3">
    <p class="text-muted">
      Login berikutnya memerlukan kode dari aplikasi authenticator (atau salah satu kode recovery).
    </p>

    <div class="stack-row sm:items-end">
      <div class="w-full sm:max-w-xs">
        <BaseFormField label="Kode saat ini" field-id="two-factor-disable-code" required>
          <BaseInput
            id="two-factor-disable-code"
            v-model="code"
            placeholder="123456"
            autocomplete="one-time-code"
          />
        </BaseFormField>
      </div>
      <BaseButton
        variant="outline"
        size="sm"
        :loading="loading"
        :disabled="!code"
        @click="emit('disable', code)"
      >
        Nonaktifkan 2FA
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BaseButton, BaseFormField, BaseInput } from '@/components/ui'

/**
 * State "2FA aktif": minta kode saat ini lalu minta induk menonaktifkan 2FA.
 * Kode disimpan di sini supaya panel induk tidak perlu menampung state-nya.
 */
defineProps<{ loading?: boolean }>()

const emit = defineEmits<{
  disable: [code: string]
}>()

const code = ref('')
</script>
