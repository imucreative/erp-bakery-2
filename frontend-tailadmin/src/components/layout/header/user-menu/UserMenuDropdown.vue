<template>
  <div
    v-if="open"
    class="absolute ltr:right-0 rtl:left-0 z-50 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark animate-fadeIn"
  >
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
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LogoutIcon, SettingsIcon } from '@/icons'
import { BaseButton } from '@/components/ui'
import UserMenuLanguage from './UserMenuLanguage.vue'

defineProps<{
  open: boolean
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
