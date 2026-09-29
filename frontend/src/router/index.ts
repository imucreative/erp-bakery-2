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
import type { RouteLocationRaw } from 'vue-router';
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
      { path: '', name: 'home', redirect: () => resolveSafeLanding() },
      {
        // Virtual landing route: never rendered directly, always resolves to
        // the first destination the current user is permitted to see. Declares
        // no permission so it can never itself be denied by the guard.
        path: 'landing',
        name: 'landing',
        meta: { title: 'Home' },
        redirect: () => resolveSafeLanding(),
      },
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

/**
 * Ordered list of candidate landing destinations for an authenticated user.
 * The first whose permission (if any) the user holds becomes the landing page.
 * `company` sits at the end as the universal fallback: it declares no
 * permission, so every authenticated user can reach it — preventing the
 * redirect loop where a permission-denied route bounces to another gated route.
 */
const LANDING_CANDIDATES: ReadonlyArray<{ name: string; permission?: string }> = [
  { name: 'dashboard-owner', permission: 'dashboard.read' },
  { name: 'users', permission: 'user.read' },
  { name: 'roles', permission: 'role.read' },
  { name: 'company' },
];

/**
 * Resolves the first landing route the current user is allowed to open.
 * Guaranteed to return a route that passes the permission guard (falls back to
 * `company`, which is ungated), so it can never trigger a redirect loop.
 */
function resolveSafeLanding(): RouteLocationRaw {
  const auth = useAuthStore();
  const target = LANDING_CANDIDATES.find(
    (candidate) =>
      !candidate.permission ||
      hasPermission(auth.permissions, auth.isSuperAdmin, candidate.permission),
  );
  return { name: target?.name ?? 'company' };
}

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    // Signed-in users should not see the login page.
    if (to.name === 'login' && auth.isAuthenticated) {
      return resolveSafeLanding();
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const required = to.meta.permission;
  if (required && !hasPermission(auth.permissions, auth.isSuperAdmin, required)) {
    // Redirect denied navigations to a route the user can actually reach,
    // never to another gated route (which could loop).
    return resolveSafeLanding();
  }

  return true;
});

/**
 * BUG #1 safety net: Reka UI's DismissableLayer sets
 * `document.body.style.pointerEvents = 'none'` while a modal dialog/drawer is
 * open and restores it on cleanup. When a route change unmounts an open dialog,
 * that cleanup can be skipped, leaving the whole page unclickable. After every
 * navigation we defensively clear the inline style so the app never gets stuck.
 */
router.afterEach(() => {
  if (typeof document !== 'undefined') {
    document.body.style.pointerEvents = '';
  }
});
