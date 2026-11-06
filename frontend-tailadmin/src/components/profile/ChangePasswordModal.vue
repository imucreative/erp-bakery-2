<template>
  <ProfileEditModal
    title="Ganti Password"
    description="Masukkan password lama, lalu password baru Anda."
    :saving="loading"
    :can-submit="canSave"
    @close="emit('close')"
    @submit="save"
  >
    <FormAlerts class="col-span-2" :error="errorMessage" />

    <ProfileFieldEditor :form="form" :fields="fields" :errors="errors" />

    <div class="col-span-2">
      <p class="text-muted">
        Sesi di perangkat lain akan dicabut otomatis. Sesi yang sedang Anda pakai tetap aktif.
      </p>
    </div>
  </ProfileEditModal>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import ProfileEditModal from './ProfileEditModal.vue'
import ProfileFieldEditor, { type ProfileEditField } from './ProfileFieldEditor.vue'
import { FormAlerts } from '@/components/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { authService } from '@/services/auth.service'
import { PASSWORD_POLICY_HINT, isPasswordValid, passwordPolicyError } from '@/lib/passwordPolicy'
import { getRefreshToken } from '@/lib/tokenStorage'

/**
 * Form ganti password. Sukses ditandai lewat emit `saved` (induk yang menampilkan
 * pesan suksesnya karena modal langsung ditutup).
 *
 * Tombol Simpan dinonaktifkan selama form belum valid (`canSubmit`), jadi pengguna
 * tidak lagi menekan tombol yang diam-diam tidak melakukan apa pun.
 */
const emit = defineEmits<{
  close: []
  saved: []
}>()

const { loading, errorMessage, run } = useAsyncAction()

const form = reactive<Record<string, string>>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const fields: ProfileEditField[] = [
  {
    key: 'currentPassword',
    label: 'Password saat ini',
    placeholder: 'Password saat ini',
    type: 'password',
    required: true,
    full: true,
  },
  {
    key: 'newPassword',
    label: 'Password baru',
    placeholder: 'Minimal 8 karakter',
    type: 'password',
    hint: PASSWORD_POLICY_HINT,
  },
  {
    key: 'confirmPassword',
    label: 'Ulangi password baru',
    placeholder: 'Ulangi password baru',
    type: 'password',
  },
]

const errors = computed<Record<string, string | null>>(() => ({
  newPassword: passwordPolicyError(form.newPassword),
  confirmPassword:
    form.confirmPassword && form.confirmPassword !== form.newPassword
      ? 'Konfirmasi password tidak sama'
      : null,
}))

const canSave = computed(
  () =>
    form.currentPassword.length > 0 &&
    isPasswordValid(form.newPassword) &&
    form.newPassword === form.confirmPassword,
)

async function save(): Promise<void> {
  if (!canSave.value) {
    return
  }

  const done = await run(() =>
    authService.changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      // Sesi yang sedang dipakai dipertahankan; sesi lain dicabut.
      keepRefreshToken: getRefreshToken(),
    }),
  )

  if (done !== null) {
    emit('saved')
  }
}
</script>
