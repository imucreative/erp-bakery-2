<template>
  <div ref="dropdownRef" class="relative">
    <button
      type="button"
      class="flex cursor-pointer items-center text-gray-700 dark:text-gray-400"
      @click.prevent="dropdownOpen = !dropdownOpen"
    >
      <UserMenuAvatar :initials="initials" class="me-3" />

      <span class="text-strong me-1">{{ displayName }}</span>

      <ChevronDownIcon
        class="size-5 text-gray-500 transition-transform duration-200 dark:text-gray-400"
        :class="{ 'rotate-180': dropdownOpen }"
      />
    </button>

    <UserMenuDropdown
      :open="dropdownOpen"
      :company-name="auth.companyName"
      :email="auth.userEmail"
      @close="dropdownOpen = false"
      @signout="signOut"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDownIcon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import UserMenuAvatar from './user-menu/UserMenuAvatar.vue'
import UserMenuDropdown from './user-menu/UserMenuDropdown.vue'

const auth = useAuthStore()
const router = useRouter()

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

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

function handleClickOutside(event: MouseEvent): void {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
