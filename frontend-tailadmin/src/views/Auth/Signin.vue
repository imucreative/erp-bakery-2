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

        <!-- Langkah 2: kode 2FA -->
        <form v-else @submit.prevent="handleVerifyMfa">
          <div class="space-y-5">
            <p class="text-muted">
              Masukkan kode 6 digit dari aplikasi authenticator, atau salah satu kode recovery.
            </p>
            <BaseFormField label="Kode 2FA" field-id="mfa-code" required>
              <BaseInput
                id="mfa-code"
                v-model="code"
                placeholder="123456 atau ABCDE-FGHIJ"
                autocomplete="one-time-code"
              />
            </BaseFormField>
            <BaseButton
              type="submit"
              full-width
              :loading="submitting"
              loading-text="Memverifikasi..."
              :disabled="submitting"
            >
              Verifikasi
            </BaseButton>
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
  PasswordInput,
} from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
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
const mfaToken = ref('')
const code = ref('')

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
  submitting.value = true
  errorMessage.value = null
  try {
    await auth.verifyMfa(mfaToken.value, code.value, rememberMe.value)
    await redirectAfterLogin()
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function backToCredentials(): void {
  step.value = 'credentials'
  mfaToken.value = ''
  code.value = ''
  errorMessage.value = null
}
</script>
