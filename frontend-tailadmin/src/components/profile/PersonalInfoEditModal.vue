<template>
  <ProfileEditModal
    title="Edit Personal Information"
    description="Perbarui data profil Anda agar tetap akurat."
    :saving="loading"
    @close="emit('close')"
    @submit="save"
  >
    <FormAlerts class="col-span-2" :error="errorMessage" :success="successMessage" />

    <ProfileFieldEditor v-model="form" :fields="fields" />

    <div class="col-span-2">
      <p class="text-muted">Email dan role tidak dapat diubah dari halaman ini.</p>
    </div>
  </ProfileEditModal>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ProfileEditModal from './ProfileEditModal.vue'
import ProfileFieldEditor, { type ProfileEditField } from './ProfileFieldEditor.vue'
import { FormAlerts } from '@/components/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { profileService, type MyProfile } from '@/services/profile.service'

/**
 * Form edit data pribadi. Nilai awal diambil dari prop `profile` saat komponen
 * dibuat (induk memakainya bersama `v-if`), hasilnya dikirim balik lewat `saved`.
 */
const props = defineProps<{ profile: MyProfile }>()

const emit = defineEmits<{
  close: []
  saved: [value: MyProfile]
}>()

const { loading, errorMessage, successMessage, run } = useAsyncAction()

const form = reactive<Record<string, string>>({
  name: props.profile.name ?? '',
  jobTitle: props.profile.jobTitle ?? '',
  phone: props.profile.phone ?? '',
  avatarUrl: props.profile.avatarUrl ?? '',
})

const fields: ProfileEditField[] = [
  { key: 'name', label: 'Nama', placeholder: 'Nama lengkap', required: true },
  { key: 'jobTitle', label: 'Jabatan', placeholder: 'mis. Owner' },
  { key: 'phone', label: 'Telepon', placeholder: '08xx' },
  { key: 'avatarUrl', label: 'URL foto profil', placeholder: 'https://...' },
]

async function save(): Promise<void> {
  const updated = await run(() =>
    profileService.update({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
    }),
  )

  if (updated) {
    emit('saved', updated)
  }
}
</script>
