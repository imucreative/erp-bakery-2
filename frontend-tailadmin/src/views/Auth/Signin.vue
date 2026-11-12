<template>
  <AuthLayout>
    <div>
      <div class="mb-5 sm:mb-8">
        <h1
          class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
        >
          Sign In
        </h1>
        <p class="text-muted">Enter your email and password to sign in!</p>
      </div>

      <div>
        <BaseAlert v-if="registeredNotice" variant="success" size="md" class="mb-4">
          Registrasi berhasil. Silakan masuk dengan akun owner Anda.
        </BaseAlert>
        <BaseAlert v-if="errorMessage" :message="errorMessage" size="md" class="mb-4" />

        <!-- Langkah 1: email + password -->
        <form v-if="step === 'credentials'" @submit.prevent="handleSubmit">
          <div class="space-y-5">
            <BaseFormField label="Email" field-id="email" required>
              <BaseInput
                id="email"
                v-model="email"
                type="email"
                name="email"
                placeholder="info@gmail.com"
              />
            </BaseFormField>

            <BaseFormField label="Password" field-id="password" required>
              <PasswordInput
                id="password"
                v-model="password"
                name="password"
                placeholder="Enter your password"
                autocomplete="current-password"
              />
            </BaseFormField>

            <div class="flex items-center justify-between gap-4">
              <label
                for="remember-me"
                class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-400"
              >
                <BaseCheckbox id="remember-me" v-model="rememberMe" />
                Keep me logged in
              </label>
              <router-link
                to="/forgot-password"
                class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >Forgot password?</router-link
              >
            </div>

            <div>
              <BaseButton
                type="submit"
                full-width
                :loading="submitting"
                loading-text="Signing in..."
                :disabled="submitting"
              >
                Sign In
              </BaseButton>
            </div>
          </div>
        </form>

        <!-- Langkah 2: verifikasi dua langkah -->
        <form v-else @submit.prevent="handleVerifyMfa">
          <div class="space-y-5">
            <div>
              <h2 class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">
                Two Step Verification
              </h2>
              <p class="text-muted">
                Masukkan 6 digit kode dari aplikasi authenticator Anda untuk melanjutkan.
              </p>
            </div>

            <div v-if="mfaMode === 'totp'">
              <p id="mfa-code-label" class="form-label">Type your 6 digits security code</p>
              <BasePinInput
                id="mfa-code"
                v-model="code"
                :length="6"
                :disabled="submitting"
                aria-labelledby="mfa-code-label"
                @complete="handlePinComplete"
              />
            </div>

            <BaseFormField
              v-else
              label="Recovery code"
              field-id="mfa-recovery"
              required
              hint="Gunakan salah satu kode recovery yang Anda simpan saat mengaktifkan 2FA."
            >
              <BaseInput
                id="mfa-recovery"
                v-model="code"
                placeholder="ABCDE-FGHIJ"
                autocomplete="one-time-code"
              />
            </BaseFormField>

            <BaseButton
              type="submit"
              full-width
              :loading="submitting"
              loading-text="Memverifikasi..."
              :disabled="submitting || !isCodeReady"
            >
              Verify My Account
            </BaseButton>

            <p class="text-sm text-gray-700 dark:text-gray-400">
              <template v-if="mfaMode === 'totp'">
                Tidak menerima kode?
                <button
                  type="button"
                  class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  @click="toggleMfaMode"
                >
                  Gunakan kode recovery
                </button>
              </template>
              <template v-else>
                Punya kode authenticator?
                <button
                  type="button"
                  class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  @click="toggleMfaMode"
                >
                  Kembali ke 6 digit
                </button>
              </template>
            </p>

            <BaseButton variant="outline" full-width type="button" @click="backToCredentials">
              Kembali ke halaman login
            </BaseButton>
          </div>
        </form>

        <div class="mt-5">
          <p
            class="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start"
          >
            Don't have an account?
            <router-link
              to="/signup"
              class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >Sign Up</router-link
            >
          </p>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import {
  BaseAlert,
  BaseButton,
  BaseCheckbox,
  BaseFormField,
  BaseInput,
  BasePinInput,
  PasswordInput,
} from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { ApiClientError } from '@/services/http'
import { toMessage } from '@/lib/errors'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const registeredNotice = computed(() => route.query.registered === '1')

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)

const step = ref<'credentials' | 'mfa'>('credentials')
const mfaMode = ref<'totp' | 'recovery'>('totp')
const mfaToken = ref('')
const code = ref('')

const isCodeReady = computed(() =>
  mfaMode.value === 'totp' ? /^\d{6}$/.test(code.value) : code.value.trim().length > 0,
)

async function redirectAfterLogin(): Promise<void> {
  if (auth.isSuperAdmin) {
    await router.push({ name: 'PlatformCompanies' })
    return
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  await router.push(redirect ?? { name: 'DashboardOwner' })
}

async function handleSubmit(): Promise<void> {
  submitting.value = true
  errorMessage.value = null
  try {
    const outcome = await auth.login({
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value,
    })
    if (outcome.mfaRequired) {
      mfaToken.value = outcome.mfaToken ?? ''
      mfaMode.value = 'totp'
      code.value = ''
      step.value = 'mfa'
      return
    }
    await redirectAfterLogin()
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

async function handleVerifyMfa(): Promise<void> {
  if (submitting.value || !isCodeReady.value) {
    return
  }
  submitting.value = true
  errorMessage.value = null
  try {
    await auth.verifyMfa(mfaToken.value, code.value, rememberMe.value)
    await redirectAfterLogin()
  } catch (error) {
    errorMessage.value = toMessage(error)
    // Wrong/expired code: clear the boxes so the user can retype immediately.
    // Keep them for network errors (the digits are still valid).
    const rejectedCode =
      error instanceof ApiClientError && (error.status === 400 || error.status === 401)
    if (mfaMode.value === 'totp' && rejectedCode) {
      code.value = ''
    }
  } finally {
    submitting.value = false
  }
}

function handlePinComplete(value: string): void {
  code.value = value
  void handleVerifyMfa()
}

function toggleMfaMode(): void {
  mfaMode.value = mfaMode.value === 'totp' ? 'recovery' : 'totp'
  code.value = ''
  errorMessage.value = null
}

function backToCredentials(): void {
  step.value = 'credentials'
  mfaMode.value = 'totp'
  mfaToken.value = ''
  code.value = ''
  errorMessage.value = null
}
</script>
