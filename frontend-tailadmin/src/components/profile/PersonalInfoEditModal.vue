<template>
  <ProfileEditModal
    title="Edit Personal Information"
    description="Perbarui data profil Anda agar tetap akurat."
    :saving="saving"
    @close="emit('close')"
    @submit="save"
  >
    <div v-if="errorMessage" class="col-span-2">
      <BaseAlert type="error" :message="errorMessage" />
    </div>

    <div class="col-span-2 lg:col-span-1">
      <BaseFormField label="Nama" field-id="profile-name" required>
        <BaseInput id="profile-name" v-model="form.name" placeholder="Nama lengkap" />
      </BaseFormField>
    </div>
    <div class="col-span-2 lg:col-span-1">
      <BaseFormField label="Jabatan" field-id="profile-job-title">
        <BaseInput id="profile-job-title" v-model="form.jobTitle" placeholder="mis. Owner" />
      </BaseFormField>
    </div>
    <div class="col-span-2 lg:col-span-1">
      <BaseFormField label="Telepon" field-id="profile-phone">
        <BaseInput id="profile-phone" v-model="form.phone" placeholder="08xx" />
      </BaseFormField>
    </div>
    <div class="col-span-2 lg:col-span-1">
      <BaseFormField label="URL foto profil" field-id="profile-avatar">
        <BaseInput id="profile-avatar" v-model="form.avatarUrl" placeholder="https://..." />
      </BaseFormField>
    </div>
    <div class="col-span-2">
      <p class="text-muted">Email dan role tidak dapat diubah dari halaman ini.</p>
    </div>
  </ProfileEditModal>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import ProfileEditModal from './ProfileEditModal.vue'
import { BaseAlert, BaseFormField, BaseInput } from '@/components/ui'
import { toMessage } from '@/lib/errors'
import { profileService, type MyProfile } from '@/services/profile.service'

/**
 * Form edit data pribadi. Dipisah dari ProfileCard.vue supaya kartunya tinggal
 * menampilkan data. Nilai awal diambil dari prop `profile` saat komponen dibuat.
 */
const props = defineProps<{ profile: MyProfile }>()

const emit = defineEmits<{
  close: []
  saved: [value: MyProfile]
}>()

const form = reactive({
  name: props.profile.name ?? '',
  jobTitle: props.profile.jobTitle ?? '',
  phone: props.profile.phone ?? '',
  avatarUrl: props.profile.avatarUrl ?? '',
})

const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function save(): Promise<void> {
  saving.value = true
  errorMessage.value = null
  try {
    const updated = await profileService.update({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
    })
    emit('saved', updated)
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    saving.value = false
  }
}
</script>
