<template>
  <AuthLayout>
    <div class="mb-5 sm:mb-8">
      <h1
        class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
      >
        Reset Password
      </h1>
      <p class="text-muted">Buat password baru untuk akun Anda.</p>
    </div>

    <div>
      <BaseAlert
        v-if="!token"
        type="error"
        size="md"
        class="mb-4"
        message="Tautan reset tidak valid — token tidak ditemukan. Silakan minta tautan baru."
      />
      <BaseAlert
        v-if="errorMessage"
        type="error"
        :message="errorMessage"
        size="md"
        class="mb-4"
      />
      <BaseAlert v-if="done" variant="success" size="md" class="mb-4">
        Password berhasil diubah dan seluruh sesi lama sudah dicabut. Silakan masuk memakai password
        baru Anda.
      </BaseAlert>

      <form v-if="token && !done" @submit.prevent="handleSubmit">
        <div class="space-y-5">
          <BaseFormField
            label="Password baru"
            field-id="new-password"
            required
            :hint="PASSWORD_POLICY_HINT"
            :error="newPasswordError"
          >
            <PasswordInput
              id="new-password"
              v-model="password"
              placeholder="Minimal 8 karakter"
              autocomplete="new-password"
            />
          </BaseFormField>
          <BaseFormField
            label="Ulangi password baru"
            field-id="confirm-password"
            required
            :error="confirmError"
          >
            <PasswordInput
              id="confirm-password"
              v-model="confirm"
              placeholder="Ulangi password baru"
              autocomplete="new-password"
              :error="confirmError"
            />
          </BaseFormField>
          <BaseButton
            type="submit"
            full-width
            :loading="submitting"
            loading-text="Menyimpan..."
            :disabled="submitting || !canSubmit"
          >
            Simpan password baru
          </BaseButton>
        </div>
      </form>

      <!-- Tautan rusak/kedaluwarsa: arahkan pengguna meminta tautan baru. -->
      <BaseButton
        v-if="!token"
        variant="primary"
        full-width
        @click="router.push({ name: 'ForgotPassword' })"
      >
        Minta tautan baru
      </BaseButton>

      <div class="mt-5">
        <p class="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
          <router-link
            to="/signin"
            class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >Kembali ke halaman login</router-link
          >
        </p>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { BaseAlert, BaseButton, BaseFormField, PasswordInput } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { toMessage } from '@/lib/errors'
import { PASSWORD_POLICY_HINT, isPasswordValid, passwordPolicyError } from '@/lib/passwordPolicy'

const route = useRoute()
const router = useRouter()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const password = ref('')
const confirm = ref('')
const submitting = ref(false)
const done = ref(false)
const errorMessage = ref<string | null>(null)

const newPasswordError = computed(() => passwordPolicyError(password.value))

const confirmError = computed(() => {
  if (!confirm.value || confirm.value === password.value) {
    return null
  }
  return 'Konfirmasi password tidak sama'
})

const canSubmit = computed(
  () => isPasswordValid(password.value) && confirm.value === password.value,
)

async function handleSubmit(): Promise<void> {
  submitting.value = true
  errorMessage.value = null
  try {
    await authService.resetPassword({ token: token.value, password: password.value })
    done.value = true
    password.value = ''
    confirm.value = ''
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>
