<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LogoutIcon, SettingsIcon } from '@/icons'
import { BaseButton } from '@/components/ui'
import UserMenuLanguage from './UserMenuLanguage.vue'

defineProps<{
  companyName: string
  email: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'signout'): void
}>()

function close(): void {
  emit('close')
}
</script>

<template>
  <div>
    <span class="text-strong block">{{ companyName || 'Bakery ERP' }}</span>
    <span class="text-meta mt-0.5 block">{{ email || '—' }}</span>
  </div>

  <ul class="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
    <li>
      <RouterLink
        to="/profile"
        class="menu-dropdown-item menu-dropdown-item-inactive"
        @click="close"
      >
        <SettingsIcon class="size-5" />
        Account settings
      </RouterLink>
    </li>

    <UserMenuLanguage @close="close" />
  </ul>

  <BaseButton variant="outline" full-width class="mt-3" @click="emit('signout')">
    <LogoutIcon class="size-5" />
    Sign out
  </BaseButton>
</template>
