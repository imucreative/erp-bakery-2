/**
 * Config-based Vue Router with auth + permission guards (ADR doc 45 §2.2,
 * doc 16). Route meta declares `public` for unauthenticated routes and an
 * optional `permission` string enforced via the permission composable logic.
 */

import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { hasPermission } from '@/composables/usePermission';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    permission?: string;
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    meta: { public: true, title: 'Sign in' },
    component: () => import('@/views/auth/LoginView.vue'),
  },
  {
    path: '/',
    component: () => import('@/layouts/DashboardLayout.vue'),
    children: [
      { path: '', name: 'home', redirect: { name: 'dashboard-owner' } },
      {
        path: 'dashboard/owner',
        name: 'dashboard-owner',
        meta: { permission: 'dashboard.read', title: 'Owner Dashboard' },
        component: () => import('@/views/dashboard/OwnerDashboard.vue'),
      },
      {
        path: 'dashboard/outlet',
        name: 'dashboard-outlet',
        meta: { permission: 'dashboard.read', title: 'Outlet Dashboard' },
        component: () => import('@/views/dashboard/OutletDashboard.vue'),
      },
      {
        path: 'users',
        name: 'users',
        meta: { permission: 'user.read', title: 'Users' },
        component: () => import('@/views/users/UsersView.vue'),
      },
      {
        path: 'roles',
        name: 'roles',
        meta: { permission: 'role.read', title: 'Roles' },
        component: () => import('@/views/roles/RolesView.vue'),
      },
      {
        // /companies/me only requires auth (no permission gate), so this route
        // intentionally declares no meta.permission.
        path: 'company',
        name: 'company',
        meta: { title: 'Company' },
        component: () => import('@/views/companies/CompanyProfileView.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    meta: { public: true, title: 'Not found' },
    component: () => import('@/views/NotFoundView.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    // Signed-in users should not see the login page.
    if (to.name === 'login' && auth.isAuthenticated) {
      return { name: 'dashboard-owner' };
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const required = to.meta.permission;
  if (required && !hasPermission(auth.permissions, auth.isSuperAdmin, required)) {
    return { name: 'dashboard-owner' };
  }

  return true;
});
