<template>
  <FullScreenLayout>
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div
        class="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900"
      >
        <div class="flex flex-col flex-1 lg:w-1/2 w-full">
          <div class="w-full max-w-md pt-10 mx-auto">
            <router-link
              to="/signin"
              class="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg
                class="stroke-current rtl:rotate-180"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
                  stroke=""
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Kembali ke halaman masuk
            </router-link>
          </div>
          <!-- Form -->
          <div class="flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-10">
            <div class="mb-5 sm:mb-8">
              <h1
                class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
              >
                Daftar Perusahaan
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Buat perusahaan baru beserta akun pemilik (owner) untuk mulai menggunakan Bakery
                ERP.
              </p>
            </div>
            <div>
              <div
                v-if="errorMessage"
                class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400"
                role="alert"
              >
                {{ errorMessage }}
              </div>
              <form @submit.prevent="handleSubmit">
                <div class="space-y-5">
                  <!-- Company Name -->
                  <div>
                    <label
                      for="companyName"
                      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                    >
                      Nama Perusahaan<span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="name"
                      type="text"
                      id="companyName"
                      name="companyName"
                      maxlength="100"
                      placeholder="Masukkan nama perusahaan"
                      @input="onNameInput"
                      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                  </div>
                  <!-- Slug -->
                  <div>
                    <label
                      for="slug"
                      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                    >
                      Slug<span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="slug"
                      type="text"
                      id="slug"
                      name="slug"
                      placeholder="nama-perusahaan"
                      @input="onSlugInput"
                      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                    <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Identifier unik: huruf kecil, angka, dan tanda hubung.
                    </p>
                  </div>
                  <!-- Owner Name -->
                  <div>
                    <label
                      for="ownerName"
                      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                    >
                      Nama Owner<span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="ownerName"
                      type="text"
                      id="ownerName"
                      name="ownerName"
                      maxlength="100"
                      placeholder="Masukkan nama pemilik"
                      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                  </div>
                  <!-- Owner Email -->
                  <div>
                    <label
                      for="ownerEmail"
                      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                    >
                      Email Owner<span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="ownerEmail"
                      type="email"
                      id="ownerEmail"
                      name="ownerEmail"
                      placeholder="owner@perusahaan.com"
                      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                  </div>
                  <!-- Owner Password -->
                  <div>
                    <label
                      for="ownerPassword"
                      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                    >
                      Password Owner<span class="text-error-500">*</span>
                    </label>
                    <div class="relative">
                      <input
                        v-model="ownerPassword"
                        :type="showPassword ? 'text' : 'password'"
                        id="ownerPassword"
                        placeholder="Minimal 8 karakter"
                        class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 px-4 ltr:pr-11 rtl:pl-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      />
                      <span
                        @click="togglePasswordVisibility"
                        class="absolute z-30 text-gray-500 -translate-y-1/2 cursor-pointer ltr:right-4 rtl:left-4 top-1/2 dark:text-gray-400"
                      >
                        <svg
                          v-if="!showPassword"
                          class="fill-current"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M10.0002 13.8619C7.23361 13.8619 4.86803 12.1372 3.92328 9.70241C4.86804 7.26761 7.23361 5.54297 10.0002 5.54297C12.7667 5.54297 15.1323 7.26762 16.0771 9.70243C15.1323 12.1372 12.7667 13.8619 10.0002 13.8619ZM10.0002 4.04297C6.48191 4.04297 3.49489 6.30917 2.4155 9.4593C2.3615 9.61687 2.3615 9.78794 2.41549 9.94552C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C13.5184 15.3619 16.5055 13.0957 17.5849 9.94555C17.6389 9.78797 17.6389 9.6169 17.5849 9.45932C16.5055 6.30919 13.5184 4.04297 10.0002 4.04297ZM9.99151 7.84413C8.96527 7.84413 8.13333 8.67606 8.13333 9.70231C8.13333 10.7286 8.96527 11.5605 9.99151 11.5605H10.0064C11.0326 11.5605 11.8646 10.7286 11.8646 9.70231C11.8646 8.67606 11.0326 7.84413 10.0064 7.84413H9.99151Z"
                            fill="#98A2B3"
                          />
                        </svg>
                        <svg
                          v-else
                          class="fill-current"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M4.63803 3.57709C4.34513 3.2842 3.87026 3.2842 3.57737 3.57709C3.28447 3.86999 3.28447 4.34486 3.57737 4.63775L4.85323 5.91362C3.74609 6.84199 2.89363 8.06395 2.4155 9.45936C2.3615 9.61694 2.3615 9.78801 2.41549 9.94558C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C11.255 15.3619 12.4422 15.0737 13.4994 14.5598L15.3625 16.4229C15.6554 16.7158 16.1302 16.7158 16.4231 16.4229C16.716 16.13 16.716 15.6551 16.4231 15.3622L4.63803 3.57709ZM12.3608 13.4212L10.4475 11.5079C10.3061 11.5423 10.1584 11.5606 10.0064 11.5606H9.99151C8.96527 11.5606 8.13333 10.7286 8.13333 9.70237C8.13333 9.5461 8.15262 9.39434 8.18895 9.24933L5.91885 6.97923C5.03505 7.69015 4.34057 8.62704 3.92328 9.70247C4.86803 12.1373 7.23361 13.8619 10.0002 13.8619C10.8326 13.8619 11.6287 13.7058 12.3608 13.4212ZM16.0771 9.70249C15.7843 10.4569 15.3552 11.1432 14.8199 11.7311L15.8813 12.7925C16.6329 11.9813 17.2187 11.0143 17.5849 9.94561C17.6389 9.78803 17.6389 9.61696 17.5849 9.45938C16.5055 6.30925 13.5184 4.04303 10.0002 4.04303C9.13525 4.04303 8.30244 4.17999 7.52218 4.43338L8.75139 5.66259C9.1556 5.58413 9.57311 5.54303 10.0002 5.54303C12.7667 5.54303 15.1323 7.26768 16.0771 9.70249Z"
                            fill="#98A2B3"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <!-- Phone (optional) -->
                  <div>
                    <label
                      for="phone"
                      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                    >
                      Telepon
                    </label>
                    <input
                      v-model="phone"
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="Opsional"
                      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                  </div>
                  <!-- Address (optional) -->
                  <div>
                    <label
                      for="address"
                      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                    >
                      Alamat
                    </label>
                    <textarea
                      v-model="address"
                      id="address"
                      name="address"
                      rows="3"
                      placeholder="Opsional"
                      class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    ></textarea>
                  </div>
                  <!-- Button -->
                  <div>
                    <button
                      type="submit"
                      :disabled="submitting"
                      class="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <svg
                        class="stroke-current"
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M10 4.167v11.666M4.167 10h11.666"
                          stroke=""
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      {{ submitting ? 'Memproses...' : 'Daftar Perusahaan' }}
                    </button>
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
                    >Masuk</router-link
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
                <img width="{231}" height="{48}" src="/images/logo/auth-logo.svg" alt="Logo" />
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

const router = useRouter()

const name = ref('')
const slug = ref('')
const ownerName = ref('')
const ownerEmail = ref('')
const ownerPassword = ref('')
const phone = ref('')
const address = ref('')

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
      phone: phone.value.trim() || undefined,
      address: address.value.trim() || undefined,
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
