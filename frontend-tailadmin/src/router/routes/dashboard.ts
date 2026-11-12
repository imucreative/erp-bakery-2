import type { RouteRecordRaw } from 'vue-router'

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'DashboardOwner',
    component: () => import('@/views/Dashboard/OwnerDashboard.vue'),
    meta: {
      title: 'Dashboard',
      permission: 'dashboard.read',
    },
  },
  {
    path: '/dashboard/outlet/:outletId',
    name: 'DashboardOutlet',
    component: () => import('@/views/Dashboard/OutletDashboard.vue'),
    meta: {
      title: 'Dashboard Outlet',
      permission: 'dashboard.read',
    },
  },
]
