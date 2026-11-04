<template>
  <aside
    :class="[
      'sidebar',
      {
        'xl:w-[290px]': isExpanded || isMobileOpen || isHovered,
        'xl:w-[90px]': !isExpanded && !isHovered,
        'translate-x-0 w-[290px]': isMobileOpen,
        'max-xl:-translate-x-full max-xl:rtl:translate-x-full': !isMobileOpen,
        'xl:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <SidebarHeader :show-content="showContent" />

    <div class="sidebar-scroll">
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <SidebarNavGroup
            v-for="group in visibleMenuGroups"
            :key="group.title"
            :label="group.title"
            :items="group.items"
            :open-submenu-index="
              openSubmenu && openSubmenu.groupTitle === group.title ? openSubmenu.itemIndex : null
            "
            :show-content="showContent"
            :pathname="route.path"
            @toggle-submenu="toggleSubmenu(group.title, $event)"
          />
        </div>
      </nav>

      <SidebarWidget v-if="showContent" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/auth'
import SidebarHeader from './SidebarHeader.vue'
import SidebarNavGroup from './SidebarNavGroup.vue'
import SidebarWidget from './SidebarWidget.vue'
import { findActiveSubmenu, menuGroups, platformMenuGroups } from './data'
import type { NavGroup, NavItem, OpenSubmenu } from './types'

const route = useRoute()

const auth = useAuthStore()
const { isExpanded, isMobileOpen, isHovered } = useSidebar()
const { can } = usePermission()

const showContent = computed(() => isExpanded.value || isHovered.value || isMobileOpen.value)

/**
 * Hanya satu submenu yang terbuka pada satu waktu. Submenu yang memuat route
 * aktif otomatis terbuka, jadi membuka layar seperti
 * `/procurement/purchase-requests/new` tetap menampilkan submenu-nya.
 */
const openSubmenu = ref<OpenSubmenu | null>(null)

const toggleSubmenu = (groupTitle: string, itemIndex: number) => {
  const current = openSubmenu.value
  openSubmenu.value =
    current && current.groupTitle === groupTitle && current.itemIndex === itemIndex
      ? null
      : { groupTitle, itemIndex }
}

/**
 * Permission-gated view of the menu. An item is shown when it has no
 * `permission` or when `can(permission)` is true; items with `subItems` keep
 * only the sub-items the user may see. Groups left with no visible items are
 * dropped entirely. Computed so it re-runs when the auth store changes.
 *
 * A super admin has no company context, so it gets the platform console menu
 * instead of the tenant ERP groups.
 */
const visibleMenuGroups = computed<NavGroup[]>(() => {
  const isItemVisible = (item: NavItem): boolean => !item.permission || can(item.permission)
  const sourceGroups = auth.isSuperAdmin ? platformMenuGroups : menuGroups

  return sourceGroups
    .map((group) => {
      const items = group.items
        .filter(isItemVisible)
        .map((item) => {
          if (!item.subItems) {
            return item
          }
          const subItems = item.subItems.filter(
            (subItem) => !subItem.permission || can(subItem.permission),
          )
          return { ...item, subItems }
        })
        .filter((item) => !item.subItems || item.subItems.length > 0)

      return { ...group, items }
    })
    .filter((group) => group.items.length > 0)
})

watch(
  () => route.path,
  (path) => {
    openSubmenu.value = findActiveSubmenu(visibleMenuGroups.value, path)
  },
  { immediate: true },
)
</script>
