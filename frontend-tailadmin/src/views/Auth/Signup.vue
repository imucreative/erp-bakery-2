<template>
  <FullScreenLayout>
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div
        class="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900"
      >
        <div class="flex flex-col flex-1 lg:w-1/2 w-full">
          <div class="w-full max-w-xl pt-10 mx-auto">
            <router-link
              to="/signin"
              class="text-muted inline-flex items-center gap-2 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
              Sign In
            </router-link>
          </div>
          <!-- Form -->
          <div class="flex flex-col justify-center flex-1 w-full max-w-xl mx-auto py-8">
            <div class="mb-5 sm:mb-8">
              <h1
                class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
              >
                Sign Up
              </h1>
              <p class="text-muted">
                Buat perusahaan baru beserta akun pemilik (owner) untuk mulai menggunakan Bakery
                ERP.
              </p>
            </div>
            <div>
              <div
                v-if="errorMessage"
                class="alert-error mb-4 px-4 py-3 dark:border-error-500/40"
                role="alert"
              >
                {{ errorMessage }}
              </div>
              <form @submit.prevent="handleSubmit">
                <div class="space-y-4">
                  <!-- Company Name -->
                  <BaseFormField label="Nama Perusahaan" field-id="companyName" required>
                    <BaseInput
                      id="companyName"
                      v-model="name"
                      type="text"
                      name="companyName"
                      maxlength="100"
                      placeholder="Masukkan nama perusahaan"
                      @input="onNameInput"
                    />
                  </BaseFormField>
                  <!-- Slug -->
                  <BaseFormField
                    label="Slug"
                    field-id="slug"
                    required
                    hint="Identifier unik: huruf kecil, angka, dan tanda hubung."
                  >
                    <BaseInput
                      id="slug"
                      v-model="slug"
                      type="text"
                      name="slug"
                      placeholder="nama-perusahaan"
                      @input="onSlugInput"
                    />
                  </BaseFormField>
                  <!-- Owner Name -->
                  <BaseFormField label="Nama Owner" field-id="ownerName" required>
                    <BaseInput
                      id="ownerName"
                      v-model="ownerName"
                      type="text"
                      name="ownerName"
                      maxlength="100"
                      placeholder="Masukkan nama pemilik"
                    />
                  </BaseFormField>
                  <!-- Owner Email + Password (side by side on >= sm) -->
                  <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <!-- Owner Email -->
                    <BaseFormField label="Email Owner" field-id="ownerEmail" required>
                      <BaseInput
                        id="ownerEmail"
                        v-model="ownerEmail"
                        type="email"
                        name="ownerEmail"
                        placeholder="owner@perusahaan.com"
                      />
                    </BaseFormField>
                    <!-- Owner Password -->
                    <BaseFormField label="Password Owner" field-id="ownerPassword" required>
                      <div class="relative">
                        <BaseInput
                          id="ownerPassword"
                          v-model="ownerPassword"
                          :type="showPassword ? 'text' : 'password'"
                          placeholder="Minimal 8 karakter"
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
                  </div>
                  <!-- Button -->
                  <div>
                    <BaseButton
                      type="submit"
                      full-width
                      :loading="submitting"
                      loading-text="Memproses..."
                      :disabled="submitting"
                    >
                      Daftar Perusahaan
                    </BaseButton>
                  </div>
                </div>
              </form>
              <div class="mt-5">
                <p
                  class="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start"
                >
                  Sudah punya akun?
                  <router-link
                    to="/signin"
                    class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >Sign In</router-link
                  >
                </p>
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
                Kelola operasional bakery Anda dalam satu platform ERP terpadu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import CommonGridShape from '@/components/common/CommonGridShape.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth.service'
import { ApiClientError } from '@/services/http'
import { BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()

const name = ref('')
const slug = ref('')
const ownerName = ref('')
const ownerEmail = ref('')
const ownerPassword = ref('')

const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
// Tracks whether the user has typed the slug manually; once true we stop
// auto-overwriting it from the company name.
const slugEditedManually = ref(false)

const SLUG_PATTERN = /^[a-z0-9-]+$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const onNameInput = () => {
  if (!slugEditedManually.value) {
    slug.value = slugify(name.value)
  }
}

const onSlugInput = () => {
  slugEditedManually.value = true
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const validate = (): string | null => {
  if (!name.value.trim()) return 'Nama perusahaan wajib diisi.'
  if (!slug.value.trim()) return 'Slug wajib diisi.'
  if (!SLUG_PATTERN.test(slug.value))
    return 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'
  if (!ownerName.value.trim()) return 'Nama owner wajib diisi.'
  if (!ownerEmail.value.trim()) return 'Email owner wajib diisi.'
  if (!EMAIL_PATTERN.test(ownerEmail.value)) return 'Format email owner tidak valid.'
  if (ownerPassword.value.length < 8) return 'Password owner minimal 8 karakter.'
  return null
}

const handleSubmit = async () => {
  errorMessage.value = null
  const validationError = validate()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  submitting.value = true
  try {
    await authService.registerCompany({
      name: name.value.trim(),
      slug: slug.value.trim(),
      ownerName: ownerName.value.trim(),
      ownerEmail: ownerEmail.value.trim(),
      ownerPassword: ownerPassword.value,
      phone: undefined,
      address: undefined,
    })
    // Backend does not return tokens, so no auto-login — send the user to sign in.
    await router.push({ name: 'Signin', query: { registered: '1' } })
  } catch (error) {
    errorMessage.value =
      error instanceof ApiClientError
        ? error.message
        : 'Gagal mendaftar. Silakan periksa data Anda dan coba lagi.'
  } finally {
    submitting.value = false
  }
}
</script>
