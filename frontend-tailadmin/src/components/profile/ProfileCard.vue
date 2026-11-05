<template>
  <div class="mb-4 rounded-2xl border border-gray-200 p-5 lg:mb-6 lg:p-6 dark:border-gray-800">
    <div class="flex flex-col gap-5 sm:flex-row xl:gap-10">
      <div class="flex-1">
        <div
          class="mb-4 flex flex-col gap-5 sm:mb-6 sm:flex-row xl:items-center xl:justify-between"
        >
          <div class="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div class="overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
              <img
                v-if="profile?.avatarUrl"
                :src="profile.avatarUrl"
                class="size-20 object-cover"
                alt="Foto profil"
              />
              <div
                v-else
                class="flex size-20 items-center justify-center bg-brand-50 text-lg font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
              >
                {{ initials }}
              </div>
            </div>
            <div class="ltr:text-left rtl:text-right">
              <h4 class="card-title mb-2">{{ profile?.name || '—' }}</h4>
              <div class="flex flex-wrap items-center gap-1 sm:gap-3">
                <p class="text-muted">{{ profile?.jobTitle || profile?.roleName || '—' }}</p>
                <div class="hidden h-3.5 w-px bg-gray-300 sm:block dark:bg-gray-700"></div>
                <p class="text-muted">{{ profile?.companyName || 'Platform' }}</p>
              </div>
            </div>
          </div>
        </div>

        <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />

        <ProfileFieldGrid :fields="fields" class="max-w-4xl" />
      </div>
      <div>
        <BaseButton variant="outline" size="sm" @click="openEdit">
          <Pencil class="size-4" />
          Edit
        </BaseButton>
      </div>
    </div>

    <ProfileEditModal
      v-if="editing"
      title="Edit Personal Information"
      description="Perbarui data profil Anda agar tetap akurat."
      :saving="saving"
      @close="closeEdit"
      @submit="save"
    >
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ProfileFieldGrid from './ProfileFieldGrid.vue'
import ProfileEditModal from './ProfileEditModal.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { toMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { profileService, type MyProfile } from '@/services/profile.service'
import { Pencil } from 'lucide-vue-next'

const profile = ref<MyProfile | null>(null)
const editing = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const form = reactive({ name: '', phone: '', jobTitle: '', avatarUrl: '' })

const initials = computed(() => {
  const name = profile.value?.name?.trim()
  if (!name) {
    return '?'
  }
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
})

const fields = computed(() => [
  { label: 'Email', value: profile.value?.email ?? '—' },
  { label: 'Telepon', value: profile.value?.phone || '—' },
  { label: 'Jabatan', value: profile.value?.jobTitle || '—' },
  { label: 'Role', value: profile.value?.roleName || profile.value?.roleCode || '—' },
  { label: 'Perusahaan', value: profile.value?.companyName || 'Platform' },
  { label: 'Login terakhir', value: formatDateTime(profile.value?.lastLoginAt ?? null) },
])

async function load(): Promise<void> {
  errorMessage.value = null
  try {
    profile.value = await profileService.get()
  } catch (error) {
    errorMessage.value = toMessage(error)
  }
}

function openEdit(): void {
  form.name = profile.value?.name ?? ''
  form.phone = profile.value?.phone ?? ''
  form.jobTitle = profile.value?.jobTitle ?? ''
  form.avatarUrl = profile.value?.avatarUrl ?? ''
  errorMessage.value = null
  editing.value = true
}

function closeEdit(): void {
  editing.value = false
}

async function save(): Promise<void> {
  saving.value = true
  errorMessage.value = null
  try {
    profile.value = await profileService.update({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
    })
    editing.value = false
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
