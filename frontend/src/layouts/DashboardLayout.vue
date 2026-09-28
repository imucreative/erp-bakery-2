<script setup lang="ts">
/**
 * DashboardLayout — authenticated shell: sidebar nav (permission-gated), top bar
 * with company name, dark-mode toggle, and logout, plus the routed content.
 */
import { computed, ref } from 'vue';
import { RouterView, useRouter, RouterLink } from 'vue-router';
import {
  LayoutDashboard,
  Store,
  ShieldCheck,
  Users,
  Building2,
  LogOut,
  Moon,
  Sun,
  Menu,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { useTheme } from '@/composables/useTheme';
import { usePermission } from '@/composables/usePermission';
import { ERPButton } from '@/components/erp';

const auth = useAuthStore();
const notify = useNotificationStore();
const router = useRouter();
const { mode, toggleTheme } = useTheme();
const { can } = usePermission();

const sidebarOpen = ref<boolean>(false);
const loggingOut = ref<boolean>(false);

interface NavItem {
  label: string;
  routeName: string;
  icon: typeof LayoutDashboard;
  permission?: string;
}

const navItems = computed<NavItem[]>(() =>
  [
    {
      label: 'Owner Dashboard',
      routeName: 'dashboard-owner',
      icon: LayoutDashboard,
      permission: 'dashboard.read',
    },
    {
      label: 'Outlet Dashboard',
      routeName: 'dashboard-outlet',
      icon: Store,
      permission: 'dashboard.read',
    },
    {
      label: 'Users',
      routeName: 'users',
      icon: Users,
      permission: 'user.read',
    },
    {
      label: 'Roles',
      routeName: 'roles',
      icon: ShieldCheck,
      permission: 'role.read',
    },
    {
      // /companies/me only requires auth, so this nav item has no permission
      // gate and shows for every authenticated user.
      label: 'Company',
      routeName: 'company',
      icon: Building2,
    },
  ].filter((item) => !item.permission || can(item.permission)),
);

const companyName = computed<string>(() => auth.company?.name ?? 'Bakery ERP');

async function onLogout(): Promise<void> {
  loggingOut.value = true;
  try {
    await auth.logout();
    notify.notifyInfo('Signed out', 'You have been logged out.');
  } finally {
    loggingOut.value = false;
    await router.push({ name: 'login' });
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="flex">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-surface transition-transform lg:static lg:translate-x-0"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex h-16 items-center border-b border-border px-6">
          <span class="text-lg font-semibold tracking-tight">Bakery ERP</span>
        </div>
        <nav class="space-y-1 p-4">
          <RouterLink
            v-for="item in navItems"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
            active-class="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
            @click="sidebarOpen = false"
          >
            <component :is="item.icon" class="h-4 w-4" aria-hidden="true" />
            {{ item.label }}
          </RouterLink>
        </nav>
      </aside>

      <!-- Mobile backdrop -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/40 lg:hidden"
        @click="sidebarOpen = false"
      />

      <!-- Main -->
      <div class="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header
          class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6"
        >
          <div class="flex items-center gap-3">
            <ERPButton
              variant="ghost"
              icon-only
              class="lg:hidden"
              aria-label="Toggle navigation"
              @click="sidebarOpen = !sidebarOpen"
            >
              <Menu class="h-5 w-5" aria-hidden="true" />
            </ERPButton>
            <span class="text-sm font-medium text-foreground">{{ companyName }}</span>
          </div>

          <div class="flex items-center gap-2">
            <ERPButton
              variant="ghost"
              icon-only
              :aria-label="mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleTheme"
            >
              <Sun v-if="mode === 'dark'" class="h-5 w-5" aria-hidden="true" />
              <Moon v-else class="h-5 w-5" aria-hidden="true" />
            </ERPButton>
            <ERPButton
              variant="secondary"
              size="sm"
              :loading="loggingOut"
              @click="onLogout"
            >
              <LogOut class="h-4 w-4" aria-hidden="true" />
              Logout
            </ERPButton>
          </div>
        </header>

        <main class="flex-1">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>
