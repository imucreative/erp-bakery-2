<template>
  <div class="w-full min-w-0">
    <div :class="['menu-group-title', showContent ? 'justify-start' : 'xl:justify-center']">
      <template v-if="showContent">{{ label }}</template>
      <HorizontalDots v-else />
    </div>

    <ul class="menu-group-list">
      <SidebarMenuItem
        v-for="(nav, index) in items"
        :key="nav.name"
        :nav="nav"
        :is-open="openSubmenuIndex === index"
        :show-content="showContent"
        :pathname="pathname"
        @toggle="emit('toggle-submenu', index)"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
import { HorizontalDots } from '@/icons'
import SidebarMenuItem from './SidebarMenuItem.vue'
import type { NavItem } from './types'

defineProps<{
  label: string
  items: NavItem[]
  openSubmenuIndex: number | null
  showContent: boolean
  pathname: string
}>()

const emit = defineEmits<{
  'toggle-submenu': [index: number]
}>()
</script>
