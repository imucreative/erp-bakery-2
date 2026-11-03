<template>
  <li>
    <button
      v-if="hasSubItems"
      type="button"
      :class="[
        'menu-item group',
        isItemActive ? 'menu-item-active' : 'menu-item-inactive',
        showContent ? null : 'menu-item-collapsed',
      ]"
      @click="emit('toggle')"
    >
      <span :class="isItemActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'">
        <component :is="nav.icon" />
      </span>
      <span v-if="showContent" class="menu-item-text">{{ nav.name }}</span>
      <span
        v-if="nav.new && showContent"
        :class="[
          'menu-dropdown-badge ms-auto',
          isItemActive ? 'menu-dropdown-badge-active' : 'menu-dropdown-badge-inactive',
        ]"
      >
        new
      </span>
      <ChevronDownIcon
        v-if="showContent"
        :class="[
          'menu-item-arrow-icon',
          { 'menu-item-arrow-active': isOpen, 'menu-item-arrow-inactive': !isOpen },
        ]"
      />
    </button>

    <router-link
      v-else-if="nav.path"
      :to="nav.path"
      :class="['menu-item group', isItemActive ? 'menu-item-active' : 'menu-item-inactive']"
    >
      <span :class="isItemActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'">
        <component :is="nav.icon" />
      </span>
      <span v-if="showContent" class="menu-item-text">{{ nav.name }}</span>
      <span v-if="nav.soon && showContent" class="menu-item-badge">Soon</span>
    </router-link>

    <transition
      @enter="startTransition"
      @after-enter="endTransition"
      @before-leave="startTransition"
      @after-leave="endTransition"
    >
      <div v-show="isOpen && showContent">
        <ul class="menu-submenu-list">
          <SidebarSubmenuItem
            v-for="subItem in nav.subItems"
            :key="subItem.name"
            :sub-item="subItem"
            :is-active="isSubItemActive(subItem.path)"
          />
        </ul>
      </div>
    </transition>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDownIcon } from '@/icons'
import { useCollapseTransition } from '@/composables/useCollapseTransition'
import { isRouteActive } from '@/lib/route'
import SidebarSubmenuItem from './SidebarSubmenuItem.vue'
import type { NavItem } from './types'

const props = defineProps<{
  nav: NavItem
  isOpen: boolean
  showContent: boolean
  pathname: string
}>()

const emit = defineEmits<{
  toggle: []
}>()

const { startTransition, endTransition } = useCollapseTransition()

const hasSubItems = computed(() => Boolean(props.nav.subItems?.length))

const isSubItemActive = (path: string) => isRouteActive(path, props.pathname)

const isItemActive = computed(() => {
  if (props.nav.path && isRouteActive(props.nav.path, props.pathname)) {
    return true
  }

  return props.nav.subItems?.some((subItem) => isSubItemActive(subItem.path)) ?? false
})
</script>
