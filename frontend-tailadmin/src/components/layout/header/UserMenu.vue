<template>
  <BasePopover
    v-model:open="dropdownOpen"
    align="end"
    :side-offset="17"
    content-class="z-[100000] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg animate-fadeIn dark:border-gray-800 dark:bg-gray-dark"
  >
    <template #trigger>
      <button
        type="button"
        class="flex cursor-pointer items-center text-gray-700 dark:text-gray-400"
      >
        <UserMenuAvatar :initials="initials" class="me-3" />

        <span class="text-strong me-1">{{ displayName }}</span>

        <ChevronDownIcon
          class="size-5 text-gray-500 transition-transform duration-200 dark:text-gray-400"
          :class="{ 'rotate-180': dropdownOpen }"
        />
      </button>
    </template>

    <UserMenuDropdown
      :company-name="auth.companyName"
      :email="auth.userEmail"
      @close="dropdownOpen = false"
      @signout="signOut"
    />
  </BasePopover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDownIcon } from '@/icons'
import { BasePopover } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import UserMenuAvatar from './user-menu/UserMenuAvatar.vue'
import UserMenuDropdown from './user-menu/UserMenuDropdown.vue'

const auth = useAuthStore()
const router = useRouter()

const dropdownOpen = ref(false)

const displayName = computed<string>(() => auth.userEmail.split('@')[0] || 'Account')

const initials = computed<string>(() => {
  const parts = displayName.value
    .split(/[._\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
})

async function signOut(): Promise<void> {
  dropdownOpen.value = false
  await auth.logout()
  await router.push({ name: 'Signin' })
}
</script>
