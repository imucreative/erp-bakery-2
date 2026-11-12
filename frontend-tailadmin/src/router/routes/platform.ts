import type { RouteRecordRaw } from 'vue-router'

export const platformRoutes: RouteRecordRaw[] = [
  // Platform console — super admin only (no company context).
  {
    path: '/platform/companies',
    name: 'PlatformCompanies',
    component: () => import('@/views/Platform/CompanyList.vue'),
    meta: {
      title: 'Companies',
      platform: true,
    },
  },
  {
    path: '/platform/users',
    name: 'PlatformUsers',
    component: () => import('@/views/Platform/UserList.vue'),
    meta: {
      title: 'Platform Users',
      platform: true,
    },
  },
  {
    path: '/platform/roles',
    name: 'PlatformRoles',
    component: () => import('@/views/Platform/RoleList.vue'),
    meta: {
      title: 'Platform Roles',
      platform: true,
    },
  },
]
