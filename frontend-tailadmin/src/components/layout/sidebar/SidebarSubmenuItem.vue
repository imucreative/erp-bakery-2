<template>
  <li>
    <router-link
      :to="subItem.path"
      :class="[
        'menu-dropdown-item',
        isActive ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive',
      ]"
    >
      {{ subItem.name }}
      <span class="menu-subitem-badges">
        <span v-if="subItem.soon" class="menu-item-badge">Soon</span>
        <span
          v-if="subItem.new"
          :class="[
            'menu-dropdown-badge',
            isActive ? 'menu-dropdown-badge-active' : 'menu-dropdown-badge-inactive',
          ]"
        >
          new
        </span>
        <span
          v-if="subItem.pro"
          :class="[
            'menu-dropdown-badge',
            isActive ? 'menu-dropdown-badge-active' : 'menu-dropdown-badge-inactive',
          ]"
        >
          pro
        </span>
      </span>
    </router-link>
  </li>
</template>

<script setup lang="ts">
import type { SubItem } from './types'

defineProps<{
  subItem: SubItem
  isActive: boolean
}>()
</script>
