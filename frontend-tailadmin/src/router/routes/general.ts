import type { RouteRecordRaw } from 'vue-router'

export const generalRoutes: RouteRecordRaw[] = [
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Others/UserProfile.vue'),
    meta: {
      title: 'Profile',
    },
  },
  {
    path: '/error-404',
    name: '404 Error',
    component: () => import('@/views/Errors/FourZeroFour.vue'),
    meta: {
      title: '404 Error',
    },
  },
]
