<template>
  <div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h4 class="card-title">Two-Factor Authentication (2FA)</h4>
      <Badge :color="enabled ? 'success' : pending ? 'warning' : 'light'">
        {{ enabled ? 'Aktif' : pending ? 'Menunggu konfirmasi' : 'Nonaktif' }}
      </Badge>
    </div>

    <BaseAlert
      v-if="requiredNotice && !enabled"
      type="error"
      class="mb-4"
      message="Konsol platform mewajibkan 2FA. Aktifkan di bawah untuk melanjutkan."
    />
    <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />
    <BaseAlert
      v-if="successMessage"
      variant="success"
      :message="successMessage"
      class="mb-4"
    />

    <div v-if="!enabled && !setupData" class="space-y-3">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Lindungi akun ini dengan kode TOTP dari aplikasi authenticator.
      </p>
      <BaseButton variant="primary" size="sm" :loading="loading" @click="startSetup">
        Aktifkan 2FA
      </BaseButton>
    </div>

    <div v-else-if="setupData" class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Tambahkan akun ini di aplikasi authenticator (Google Authenticator, Authy, 1Password,
        ...) memakai kunci berikut:
      </p>
      <div class="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm break-all dark:bg-white/5">
        {{ setupData.secret }}
      </div>
      <p class="text-xs break-all text-gray-400 dark:text-gray-500">{{ setupData.otpauthUri }}</p>

      <div
        v-if="setupData.recoveryCodes.length"
        class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
      >
        <p class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Kode recovery (simpan sekarang — hanya ditampilkan sekali):
        </p>
        <div
          class="grid grid-cols-2 gap-1 font-mono text-xs text-gray-700 sm:grid-cols-3 dark:text-gray-300"
        >
          <span v-for="rc in setupData.recoveryCodes" :key="rc">{{ rc }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div class="w-full sm:max-w-xs">
          <BaseFormField label="Kode dari authenticator" field-id="two-factor-code" required>
            <BaseInput
              id="two-factor-code"
              v-model="code"
              placeholder="123456"
              autocomplete="one-time-code"
            />
          </BaseFormField>
        </div>
        <BaseButton
          variant="primary"
          size="sm"
          :loading="loading"
          :disabled="!code"
          @click="enable"
        >
          Konfirmasi &amp; aktifkan
        </BaseButton>
        <BaseButton variant="outline" size="sm" :disabled="loading" @click="cancelSetup">
          Batal
        </BaseButton>
      </div>
    </div>

    <div v-else class="space-y-3">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        2FA aktif. Login berikutnya memerlukan kode dari aplikasi authenticator (atau kode
        recovery).
      </p>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
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
        <BaseButton variant="outline" size="sm" :loading="loading" :disabled="!code" @click="disable">
          Nonaktifkan 2FA
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Badge from '@/components/ui/Badge.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { authService, type TwoFactorSetup } from '@/services/auth.service'
import { ApiClientError } from '@/services/http'
import { resetTwoFactorGate } from '@/lib/twoFactorGate'

const route = useRoute()
const requiredNotice = computed(() => route.query.twoFactor === 'required')

const enabled = ref(false)
const pending = ref(false)
const setupData = ref<TwoFactorSetup | null>(null)
const code = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

async function refresh(): Promise<void> {
  try {
    const status = await authService.getTwoFactorStatus()
    enabled.value = status.enabled
    pending.value = status.pending
  } catch {
    // Status is informational only; keep the card usable.
  }
}

async function startSetup(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    setupData.value = await authService.setupTwoFactor()
    code.value = ''
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    loading.value = false
  }
}

async function enable(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    await authService.enableTwoFactor(code.value.trim())
    enabled.value = true
    pending.value = false
    setupData.value = null
    code.value = ''
    successMessage.value = '2FA berhasil diaktifkan.'
    resetTwoFactorGate()
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    loading.value = false
  }
}

async function disable(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    await authService.disableTwoFactor(code.value.trim())
    enabled.value = false
    pending.value = false
    code.value = ''
    successMessage.value = '2FA dinonaktifkan.'
    resetTwoFactorGate()
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    loading.value = false
  }
}

function cancelSetup(): void {
  setupData.value = null
  code.value = ''
  errorMessage.value = null
}

onMounted(() => {
  void refresh()
})
</script>
