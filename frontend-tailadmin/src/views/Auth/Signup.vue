<template>
  <AuthLayout size="xl" content-class="py-8">
    <template #top>
      <div class="w-full max-w-xl pt-10 mx-auto">
        <router-link
          to="/signin"
          class="text-muted inline-flex items-center gap-2 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          Sign In
        </router-link>
      </div>
    </template>

    <div class="mb-5 sm:mb-8">
      <h1
        class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
      >
        Sign Up
      </h1>
      <p class="text-muted">
        Buat perusahaan baru beserta akun pemilik (owner) untuk mulai menggunakan Bakery ERP.
      </p>
    </div>

    <div>
      <BaseAlert v-if="errorMessage" :message="errorMessage" size="md" class="mb-4" />

      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
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

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <BaseFormField label="Email Owner" field-id="ownerEmail" required>
              <BaseInput
                id="ownerEmail"
                v-model="ownerEmail"
                type="email"
                name="ownerEmail"
                placeholder="owner@perusahaan.com"
              />
            </BaseFormField>

            <BaseFormField
              label="Password Owner"
              field-id="ownerPassword"
              required
              :hint="PASSWORD_POLICY_HINT"
              :error="passwordError"
            >
              <PasswordInput
                id="ownerPassword"
                v-model="ownerPassword"
                placeholder="Minimal 8 karakter"
                autocomplete="new-password"
                :error="passwordError"
              />
            </BaseFormField>
          </div>

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
        <p class="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
          Sudah punya akun?
          <router-link to="/signin" class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >Sign In</router-link
          >
        </p>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput, PasswordInput } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { ApiClientError } from '@/services/http'
import { PASSWORD_POLICY_HINT, isPasswordValid, passwordPolicyError } from '@/lib/passwordPolicy'

const router = useRouter()

const name = ref('')
const slug = ref('')
const ownerName = ref('')
const ownerEmail = ref('')
const ownerPassword = ref('')

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

const passwordError = computed(() => {
  if (!ownerPassword.value) {
    return null
  }
  return passwordPolicyError(ownerPassword.value)
})

const validate = (): string | null => {
  if (!name.value.trim()) return 'Nama perusahaan wajib diisi.'
  if (!slug.value.trim()) return 'Slug wajib diisi.'
  if (!SLUG_PATTERN.test(slug.value))
    return 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'
  if (!ownerName.value.trim()) return 'Nama owner wajib diisi.'
  if (!ownerEmail.value.trim()) return 'Email owner wajib diisi.'
  if (!EMAIL_PATTERN.test(ownerEmail.value)) return 'Format email owner tidak valid.'
  if (!ownerPassword.value) return 'Password owner wajib diisi.'
  if (!isPasswordValid(ownerPassword.value)) {
    return passwordPolicyError(ownerPassword.value) ?? 'Password owner tidak memenuhi kebijakan.'
  }
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
