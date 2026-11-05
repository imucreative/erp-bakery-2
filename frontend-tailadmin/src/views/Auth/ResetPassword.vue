<template>
  <FullScreenLayout>
    <div class="bg-white p-6 dark:bg-gray-900 relative z-1 sm:p-0">
      <div class="flex h-screen w-full flex-col justify-center dark:bg-gray-900 lg:flex-row">
        <div class="flex w-full flex-1 flex-col lg:w-1/2">
          <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div>
              <div class="mb-5 sm:mb-8">
                <h1
                  class="text-title-sm mb-2 font-semibold text-gray-800 dark:text-white/90 sm:text-title-md"
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
                  Password berhasil diubah dan seluruh sesi lama sudah dicabut. Silakan masuk memakai
                  password baru Anda.
                </BaseAlert>

                <form v-if="token && !done" @submit.prevent="handleSubmit">
                  <div class="space-y-5">
                    <BaseFormField label="Password baru" field-id="new-password" required>
                      <BaseInput
                        id="new-password"
                        v-model="password"
                        type="password"
                        placeholder="Minimal 8 karakter"
                      />
                    </BaseFormField>
                    <BaseFormField
                      label="Ulangi password baru"
                      field-id="confirm-password"
                      required
                      :error="confirmError"
                    >
                      <BaseInput
                        id="confirm-password"
                        v-model="confirm"
                        type="password"
                        placeholder="Ulangi password baru"
                        :error="confirmError || undefined"
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

                <div class="mt-5">
                  <p
                    class="text-center text-sm font-normal text-gray-700 dark:text-gray-400 sm:text-start"
                  >
                    <router-link
                      to="/signin"
                      class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                      >Kembali ke halaman login</router-link
                    >
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { toMessage } from '@/lib/errors'

const route = useRoute()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const password = ref('')
const confirm = ref('')
const submitting = ref(false)
const done = ref(false)
const errorMessage = ref<string | null>(null)

const confirmError = computed(() => {
  if (!confirm.value || confirm.value === password.value) {
    return null
  }
  return 'Konfirmasi password tidak sama'
})

const canSubmit = computed(
  () => password.value.length >= 8 && confirm.value === password.value,
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
