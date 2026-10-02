<template>
  <aside
    :class="[
      'fixed flex flex-col mt-0 top-0 px-5 start-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-99999 border-e border-gray-200',
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
    <div
      :class="[
        'pt-8 pb-7 flex',
        !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start',
      ]"
    >
      <router-link to="/">
        <img
          v-if="isExpanded || isHovered || isMobileOpen"
          class="dark:hidden"
          src="/images/logo/logo.svg"
          alt="Logo"
          width="150"
          height="40"
        />
        <img
          v-if="isExpanded || isHovered || isMobileOpen"
          class="hidden dark:block"
          src="/images/logo/logo-dark.svg"
          alt="Logo"
          width="150"
          height="40"
        />
        <img
          v-else
          src="/images/logo/logo-icon.svg"
          alt="Logo"
          width="32"
          height="32"
        />
      </router-link>
    </div>
    <div
      class="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar"
    >
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <div
            v-for="(menuGroup, groupIndex) in visibleMenuGroups"
            :key="menuGroup.title"
          >
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-5 text-gray-400',
                !isExpanded && !isHovered
                  ? 'xl:justify-center'
                  : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ menuGroup.title }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-1">
              <li v-for="(item, index) in menuGroup.items" :key="item.name">
                <button
                  v-if="item.subItems"
                  @click="toggleSubmenu(groupIndex, index)"
                  :class="[
                    'menu-item group w-full',
                    {
                      'menu-item-active': isSubmenuOpen(groupIndex, index),
                      'menu-item-inactive': !isSubmenuOpen(groupIndex, index),
                    },
                    !isExpanded && !isHovered
                      ? 'xl:justify-center'
                      : 'xl:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(groupIndex, index)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text truncate"
                    >{{ item.name }}</span
                  >
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ms-auto w-5 h-5 transition-transform duration-200',
                      {
                        'rotate-180 text-brand-500': isSubmenuOpen(
                          groupIndex,
                          index
                        ),
                      },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="item.path"
                  :to="item.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(item.path),
                      'menu-item-inactive': !isActive(item.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(item.path)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                </router-link>
                <transition
                  @enter="startTransition"
                  @after-enter="endTransition"
                  @before-leave="startTransition"
                  @after-leave="endTransition"
                >
                  <div
                    v-show="
                      isSubmenuOpen(groupIndex, index) &&
                      (isExpanded || isHovered || isMobileOpen)
                    "
                  >
                    <ul class="mt-2 space-y-1 ms-9">
                      <li v-for="subItem in item.subItems" :key="subItem.name">
                        <router-link
                          :to="subItem.path"
                          :class="[
                            'menu-dropdown-item',
                            {
                              'menu-dropdown-item-active': isActive(
                                subItem.path
                              ),
                              'menu-dropdown-item-inactive': !isActive(
                                subItem.path
                              ),
                            },
                          ]"
                        >
                          {{ subItem.name }}
                          <span class="flex items-center gap-1 ms-auto">
                            <span
                              v-if="subItem.new"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              new
                            </span>
                            <span
                              v-if="subItem.pro"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              pro
                            </span>
                          </span>
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </transition>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <SidebarWidget v-if="isExpanded || isHovered || isMobileOpen" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Boxes,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Inbox,
  Layers,
  LayoutDashboard,
  Package,
  Ruler,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag,
  Truck,
  UserCircle,
  Users,
} from 'lucide-vue-next'

import { useSidebar } from '@/composables/useSidebar'
import { usePermission } from '@/composables/usePermission'
import { ChevronDownIcon, HorizontalDots } from '@/icons'
import SidebarWidget from './SidebarWidget.vue'

const route = useRoute()

const { isExpanded, isMobileOpen, isHovered, openSubmenu } = useSidebar()
const { can } = usePermission()

interface SubItem {
  name: string
  path: string
  pro?: boolean
  new?: boolean
  permission?: string
}

interface MenuItem {
  icon?: any
  name: string
  path?: string
  subItems?: SubItem[]
  new?: boolean
  pro?: boolean
  permission?: string
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    title: 'Master Data',
    items: [
      {
        icon: Store,
        name: 'Outlets',
        path: '/master/outlets',
        permission: 'outlet.read',
      },
      {
        icon: Ruler,
        name: 'Units of Measure',
        path: '/master/uoms',
        permission: 'uom.read',
      },
      {
        icon: Truck,
        name: 'Suppliers',
        path: '/master/suppliers',
        permission: 'supplier.read',
      },
      {
        icon: CreditCard,
        name: 'Payment Terms',
        path: '/master/payment-terms',
        permission: 'payment-term.read',
      },
      {
        icon: Layers,
        name: 'Product Groups',
        path: '/master/product-groups',
        permission: 'product-group.read',
      },
      {
        icon: Tag,
        name: 'Categories',
        path: '/master/categories',
        permission: 'category.read',
      },
      {
        icon: Package,
        name: 'Products',
        path: '/master/products',
        permission: 'product.read',
      },
    ],
  },
  {
    title: 'Procurement',
    items: [
      {
        icon: ClipboardList,
        name: 'Purchase Requests',
        path: '/procurement/purchase-requests',
        permission: 'procurement.pr.read',
      },
      {
        icon: ShoppingCart,
        name: 'Purchase Orders',
        path: '/procurement/purchase-orders',
        permission: 'procurement.po.read',
      },
      {
        icon: Inbox,
        name: 'Goods Receipts',
        path: '/procurement/goods-receipts',
        permission: 'procurement.gr.read',
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        icon: Boxes,
        name: 'Stock On Hand',
        path: '/inventory/stock-on-hand',
        permission: 'inventory.read',
      },
      {
        icon: ScrollText,
        name: 'Stock Ledger',
        path: '/inventory/ledger',
        permission: 'inventory.read',
      },
      {
        icon: CalendarClock,
        name: 'Batch & Expiry',
        path: '/inventory/batches',
        permission: 'inventory.read',
      },
      {
        icon: SlidersHorizontal,
        name: 'Stock Adjustment',
        path: '/inventory/adjustments',
        permission: 'inventory.adjustment.read',
      },
    ],
  },
  {
    title: 'System Administration',
    items: [
      {
        icon: Users,
        name: 'Users',
        path: '/system/users',
        permission: 'user.read',
      },
      {
        icon: ShieldCheck,
        name: 'Roles',
        path: '/system/roles',
        permission: 'role.read',
      },
    ],
  },
  {
    title: 'Menu',
    items: [
      {
        icon: LayoutDashboard,
        name: 'Dashboard',
        subItems: [{ name: 'Ecommerce', path: '/', pro: false }],
      },
      {
        icon: UserCircle,
        name: 'User Profile',
        path: '/profile',
      },
    ],
  },
]

/**
 * Permission-gated view of the menu. An item is shown when it has no
 * `permission` or when `can(permission)` is true; items with `subItems` keep
 * only the sub-items the user may see. Groups left with no visible items are
 * dropped entirely. Computed so it re-runs when the auth store changes.
 */
const visibleMenuGroups = computed<MenuGroup[]>(() => {
  const isItemVisible = (item: MenuItem): boolean =>
    !item.permission || can(item.permission)

  return menuGroups
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

const isActive = (path?: string) => (path ? route.path === path : false)

const setActiveMenuFromRoute = () => {
  visibleMenuGroups.value.forEach((group, groupIndex) => {
    group.items.forEach((item, itemIndex) => {
      if (item.subItems?.some((subItem) => isActive(subItem.path))) {
        openSubmenu.value = `${groupIndex}-${itemIndex}`
      }
    })
  })
}

watch(
  () => route.path,
  () => {
    setActiveMenuFromRoute()
  },
  { immediate: true },
)

const toggleSubmenu = (groupIndex: number, itemIndex: number) => {
  const key = `${groupIndex}-${itemIndex}`
  openSubmenu.value = openSubmenu.value === key ? null : key
}

const isSubmenuOpen = (groupIndex: number, itemIndex: number) => {
  const key = `${groupIndex}-${itemIndex}`
  return openSubmenu.value === key
}

const startTransition = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = 'auto'
  const height = htmlEl.scrollHeight
  htmlEl.style.height = '0px'
  void htmlEl.offsetHeight // force reflow
  htmlEl.style.height = height + 'px'
}

const endTransition = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
}
</script>
