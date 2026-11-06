<template>
  <AuthLayout>
    <div class="mb-5 sm:mb-8">
      <h1
        class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
      >
        Lupa Password
      </h1>
      <p class="text-muted">
        Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru.
      </p>
    </div>

    <div>
      <BaseAlert v-if="sent" variant="success" size="md" class="mb-4">
        Tautan reset sudah dibuat untuk <strong>{{ sentTo }}</strong> dan dikirim ke email tersebut.
        Tautan berlaku 60 menit dan hanya bisa dipakai sekali.
      </BaseAlert>
      <BaseAlert
        v-if="errorMessage"
        type="error"
        :message="errorMessage"
        size="md"
        class="mb-4"
      />

      <form v-if="!sent" @submit.prevent="handleSubmit">
        <div class="space-y-5">
          <BaseFormField label="Email" field-id="forgot-email" required>
            <BaseInput
              id="forgot-email"
              v-model="email"
              type="email"
              name="email"
              placeholder="info@gmail.com"
            />
          </BaseFormField>
          <BaseButton
            type="submit"
            full-width
            :loading="submitting"
            loading-text="Mengirim..."
            :disabled="submitting || !email"
          >
            Kirim tautan reset
          </BaseButton>
        </div>
      </form>

      <!--
        Hanya tampil di lingkungan non-produksi: selama email belum dikonfigurasi,
        backend mengembalikan tautannya agar pilot tetap bisa berjalan.
      -->
      <div v-if="resetLink" class="mt-5">
        <p class="text-meta mb-2">
          Mode pengembangan — email belum dikonfigurasi, gunakan tautan berikut:
        </p>
        <a
          :href="resetLink"
          class="text-sm break-all text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >{{ resetLink }}</a
        >
      </div>

      <div class="mt-5">
        <p
          class="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start"
        >
          Ingat password Anda?
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
import { ref } from 'vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { toMessage } from '@/lib/errors'

const email = ref('')
const submitting = ref(false)
const sent = ref(false)
const sentTo = ref('')
const resetLink = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

async function handleSubmit(): Promise<void> {
  submitting.value = true
  errorMessage.value = null
  try {
    const result = await authService.forgotPassword(email.value.trim())
    resetLink.value = result.resetLink
    sentTo.value = email.value.trim()
    sent.value = true
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>
