<template>
  <ProfileEditModal
    title="Ganti Password"
    description="Masukkan password lama, lalu password baru Anda."
    :saving="saving"
    @close="emit('close')"
    @submit="save"
  >
    <div v-if="errorMessage" class="col-span-2">
      <BaseAlert type="error" :message="errorMessage" />
    </div>

    <div class="col-span-2">
      <BaseFormField label="Password saat ini" field-id="current-password" required>
        <BaseInput
          id="current-password"
          v-model="form.current"
          type="password"
          placeholder="Password saat ini"
        />
      </BaseFormField>
    </div>
    <div>
      <BaseFormField
        label="Password baru"
        field-id="new-password"
        required
        :error="newPasswordError"
      >
        <BaseInput
          id="new-password"
          v-model="form.next"
          type="password"
          placeholder="Minimal 8 karakter"
          :error="newPasswordError || undefined"
        />
      </BaseFormField>
    </div>
    <div>
      <BaseFormField
        label="Ulangi password baru"
        field-id="confirm-new-password"
        required
        :error="confirmPasswordError"
      >
        <BaseInput
          id="confirm-new-password"
          v-model="form.confirm"
          type="password"
          placeholder="Ulangi password baru"
          :error="confirmPasswordError || undefined"
        />
      </BaseFormField>
    </div>

    <div class="col-span-2">
      <p class="text-muted">
        Sesi di perangkat lain akan dicabut otomatis. Sesi yang sedang Anda pakai tetap aktif.
      </p>
    </div>
  </ProfileEditModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ProfileEditModal from './ProfileEditModal.vue'
import { BaseAlert, BaseFormField, BaseInput } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { toMessage } from '@/lib/errors'
import { getRefreshToken } from '@/lib/tokenStorage'

/**
 * Form ganti password, dipisah dari Security.vue supaya kartu Security tinggal
 * menjadi daftar baris + panel. Sukses ditandai lewat emit `saved`.
 */
const emit = defineEmits<{
  close: []
  saved: []
}>()

const form = reactive({ current: '', next: '', confirm: '' })
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const newPasswordError = computed(() =>
  form.next && form.next.length < 8 ? 'Minimal 8 karakter' : null,
)

const confirmPasswordError = computed(() =>
  form.confirm && form.confirm !== form.next ? 'Konfirmasi password tidak sama' : null,
)

const canSave = computed(
  () => form.current.length > 0 && form.next.length >= 8 && form.next === form.confirm,
)

async function save(): Promise<void> {
  if (!canSave.value) {
    return
  }

  saving.value = true
  errorMessage.value = null
  try {
    await authService.changePassword({
      currentPassword: form.current,
      newPassword: form.next,
      // Sesi yang sedang dipakai dipertahankan; sesi lain dicabut.
      keepRefreshToken: getRefreshToken(),
    })
    form.current = ''
    form.next = ''
    form.confirm = ''
    emit('saved')
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    saving.value = false
  }
}
</script>
