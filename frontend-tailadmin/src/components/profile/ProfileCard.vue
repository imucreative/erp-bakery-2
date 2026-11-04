<template>
  <div class="mb-4 rounded-2xl border border-gray-200 p-5 lg:mb-6 lg:p-6 dark:border-gray-800">
    <div class="flex flex-col gap-5 sm:flex-row xl:gap-10">
      <div class="flex-1">
        <div
          class="mb-4 flex flex-col gap-5 sm:mb-6 sm:flex-row xl:items-center xl:justify-between"
        >
          <div
            class="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6"
          >
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

        <div
          class="relative grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-11 xl:gap-y-7"
        >
          <div v-for="field in fields" :key="field.label" class="w-full">
            <p class="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              {{ field.label }}
            </p>
            <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ field.value }}</p>
          </div>
        </div>
      </div>
      <div>
        <BaseButton variant="outline" size="sm" @click="openEdit">Edit</BaseButton>
      </div>
    </div>

    <Modal v-if="editing" @close="closeEdit">
      <template #body>
        <div
          class="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900"
        >
          <div class="px-2">
            <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p class="text-muted mb-6 lg:mb-7">
              Perbarui data profil Anda agar tetap akurat.
            </p>
          </div>
          <form class="flex flex-col" @submit.prevent="save">
            <div class="grid grid-cols-1 gap-x-6 gap-y-5 px-2 lg:grid-cols-2">
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
                  <BaseInput
                    id="profile-avatar"
                    v-model="form.avatarUrl"
                    placeholder="https://..."
                  />
                </BaseFormField>
              </div>
              <div class="col-span-2">
                <p class="text-muted">Email dan role tidak dapat diubah dari halaman ini.</p>
              </div>
            </div>
            <div class="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <BaseButton variant="outline" size="sm" type="button" @click="closeEdit">
                Batal
              </BaseButton>
              <BaseButton variant="primary" size="sm" type="submit" :loading="saving">
                Simpan
              </BaseButton>
            </div>
          </form>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Modal from './Modal.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { ApiClientError } from '@/services/http'
import { profileService, type MyProfile } from '@/services/profile.service'

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

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
