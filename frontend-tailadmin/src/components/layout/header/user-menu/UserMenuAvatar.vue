<template>
  <span
    class="size-11 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-800"
  >
    <img v-if="avatarUrl" :src="avatarUrl" :alt="alt" class="size-full object-cover" />
    <span
      v-else
      class="tone-brand flex size-full items-center justify-center rounded-full text-sm font-semibold"
    >
      {{ initials }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { profileService } from '@/services/profile.service'

withDefaults(
  defineProps<{
    initials: string
    alt?: string
  }>(),
  { alt: 'User' },
)

const avatarUrl = ref<string | null>(null)

async function loadAvatar(): Promise<void> {
  try {
    const profile = await profileService.get()
    avatarUrl.value = profile.avatarUrl
  } catch {
    avatarUrl.value = null
  }
}

onMounted(() => {
  void loadAvatar()
})
</script>
