<template>
  <div class="mb-6 rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
    <h4 class="card-title mb-3 lg:mb-6">Security</h4>

    <div>
      <!-- Change password -->
      <div
        class="flex flex-col justify-between gap-4 border-b border-gray-200 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-end dark:border-gray-800"
      >
        <div>
          <span class="block text-base mb-1 font-medium text-gray-800 dark:text-white/90"
            >Change Password</span
          >
          <p class="text-muted">Update your account password regularly.</p>
        </div>
        <div>
          <button
            type="button"
            class="shadow-theme-xs flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 pr-4 pl-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M12.3861 5.08087L14.9182 7.61296M15.6437 3.5917L16.408 4.35603C16.8962 4.84419 16.8962 5.63564 16.408 6.1238L7.83547 14.6963C7.69039 14.8414 7.51182 14.9486 7.31554 15.0083L3.97461 16.0251L4.99141 12.6842C5.05115 12.4879 5.15829 12.3093 5.30337 12.1642L13.8759 3.5917C14.3641 3.10355 15.1555 3.10355 15.6437 3.5917Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Change Password
          </button>
        </div>
      </div>

      <!-- Two-factor authentication -->
      <div
        class="flex flex-col justify-between gap-4 border-b border-gray-200 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-end dark:border-gray-800"
      >
        <div>
          <span class="block mb-1 text-base font-medium text-gray-800 dark:text-white/90"
            >Two-factor authentication (2FA)</span
          >
          <p class="text-muted">Keep your account secure by enabling 2FA</p>
        </div>
        <div>
          <Badge :color="enabled ? 'success' : pending ? 'warning' : 'light'">
            {{ enabled ? 'Aktif' : pending ? 'Menunggu konfirmasi' : 'Nonaktif' }}
          </Badge>
        </div>
      </div>

      <!-- 2FA body -->
      <div class="pt-4">
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

        <!-- Not enrolled -->
        <div v-if="!enabled && !setupData" class="space-y-3">
          <p class="text-muted">
            Gunakan aplikasi authenticator (Google Authenticator, Authy, 1Password, ...) untuk
            menghasilkan kode 6 digit setiap kali login.
          </p>
          <BaseButton variant="primary" size="sm" :loading="loading" @click="startSetup">
            Aktifkan 2FA
          </BaseButton>
        </div>

        <!-- Enrollment in progress -->
        <div v-else-if="setupData" class="space-y-4">
          <p class="text-muted">
            Tambahkan akun ini di aplikasi authenticator memakai kunci berikut:
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

        <!-- Enabled -->
        <div v-else class="space-y-3">
          <p class="text-muted">
            Login berikutnya memerlukan kode dari aplikasi authenticator (atau salah satu kode
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
            <BaseButton
              variant="outline"
              size="sm"
              :loading="loading"
              :disabled="!code"
              @click="disable"
            >
              Nonaktifkan 2FA
            </BaseButton>
          </div>
        </div>
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
    // Status is informational only; keep the section usable.
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
