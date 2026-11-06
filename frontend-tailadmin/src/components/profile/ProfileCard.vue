<template>
  <div class="section-card mb-4 lg:mb-6">
    <div class="toolbar-row mb-4 sm:mb-6">
      <div class="flex w-full items-center gap-4 sm:gap-6">
        <div class="overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
          <img
            v-if="profile?.avatarUrl"
            :src="profile.avatarUrl"
            class="size-20 object-cover"
            alt="Foto profil"
          />
          <div
            v-else
            class="tone-brand flex size-20 items-center justify-center rounded-full text-lg font-semibold"
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

      <BaseButton v-if="profile" variant="outline" size="sm" @click="editing = true">
        <Pencil class="size-4" />
        Edit
      </BaseButton>
    </div>

    <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />

    <ProfileFieldGrid v-if="profile" :fields="fields" />

    <PersonalInfoEditModal
      v-if="editing && profile"
      :profile="profile"
      @close="editing = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Pencil } from 'lucide-vue-next'
import ProfileFieldGrid from './ProfileFieldGrid.vue'
import PersonalInfoEditModal from './PersonalInfoEditModal.vue'
import { BaseAlert, BaseButton } from '@/components/ui'
import { toMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { profileService, type MyProfile } from '@/services/profile.service'

const profile = ref<MyProfile | null>(null)
const editing = ref(false)
const errorMessage = ref<string | null>(null)

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

function onSaved(updated: MyProfile): void {
  profile.value = updated
  editing.value = false
}

onMounted(() => {
  void load()
})
</script>
