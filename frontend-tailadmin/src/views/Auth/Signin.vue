<template>
  <FullScreenLayout>
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div
        class="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900"
      >
        <div class="flex flex-col flex-1 lg:w-1/2 w-full">
          <div class="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <div>
              <div class="mb-5 sm:mb-8">
                <h1
                  class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
                >
                  Sign In
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Enter your email and password to sign in!
                </p>
              </div>
              <div>
                <div
                  v-if="registeredNotice"
                  class="mb-4 rounded-lg border border-success-500/40 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-400"
                  role="status"
                >
                  Registrasi berhasil. Silakan masuk dengan akun owner Anda.
                </div>
                <div
                  v-if="errorMessage"
                  class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400"
                  role="alert"
                >
                  {{ errorMessage }}
                </div>
                <form @submit.prevent="handleSubmit">
                  <div class="space-y-5">
                    <!-- Email -->
                    <BaseFormField label="Email" field-id="email" required>
                      <BaseInput
                        id="email"
                        v-model="email"
                        type="email"
                        name="email"
                        placeholder="info@gmail.com"
                      />
                    </BaseFormField>
                    <!-- Password -->
                    <BaseFormField label="Password" field-id="password" required>
                      <div class="relative">
                        <BaseInput
                          id="password"
                          v-model="password"
                          :type="showPassword ? 'text' : 'password'"
                          placeholder="Enter your password"
                          class="pe-11"
                        />
                        <span
                          @click="togglePasswordVisibility"
                          class="absolute z-30 text-gray-500 -translate-y-1/2 cursor-pointer ltr:right-4 rtl:left-4 top-1/2 dark:text-gray-400"
                        >
                          <EyeOff v-if="!showPassword" class="h-5 w-5" aria-hidden="true" />
                          <Eye v-else class="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>
                    </BaseFormField>
                    <!-- Checkbox -->
                    <div class="flex items-center justify-between">
                      <BaseToggle v-model="keepLoggedIn" label="Keep me logged in" />
                      <router-link
                        to="/reset-password"
                        class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                        >Forgot password?</router-link
                      >
                    </div>
                    <!-- Button -->
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
          </div>
        </div>
        <div
          class="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden relative"
        >
          <div class="items-center justify-center flex z-1">
            <common-grid-shape />
            <div class="flex flex-col items-center max-w-xs">
              <router-link to="/" class="block mb-4">
                <img width="{231}" height="{48}" src="/images/logo/logo-dark.svg" alt="Logo" />
              </router-link>
              <p class="text-center text-gray-400 dark:text-white/60">
                Free and Open-Source Tailwind CSS Admin Dashboard Template
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import CommonGridShape from '@/components/common/CommonGridShape.vue'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiClientError } from '@/services/http'
import { BaseButton, BaseFormField, BaseInput, BaseToggle } from '@/components/ui'
import { Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const registeredNotice = computed(() => route.query.registered === '1')

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const keepLoggedIn = ref(false)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const handleSubmit = async () => {
  submitting.value = true
  errorMessage.value = null
  try {
    await auth.login({ email: email.value, password: password.value })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect ?? { name: 'Ecommerce' })
  } catch (error) {
    errorMessage.value =
      error instanceof ApiClientError
        ? error.message
        : 'Unable to sign in. Please check your credentials and try again.'
  } finally {
    submitting.value = false
  }
}
</script>
