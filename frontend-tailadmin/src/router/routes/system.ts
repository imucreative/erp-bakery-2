import type { RouteRecordRaw } from 'vue-router'

export const systemRoutes: RouteRecordRaw[] = [
  {
    path: '/system/users',
    name: 'Users',
    component: () => import('@/views/System/UserList.vue'),
    meta: {
      title: 'Users',
      permission: 'user.read',
    },
  },
  {
    path: '/system/roles',
    name: 'Roles',
    component: () => import('@/views/System/RoleList.vue'),
    meta: {
      title: 'Roles',
      permission: 'role.read',
    },
  },
]
