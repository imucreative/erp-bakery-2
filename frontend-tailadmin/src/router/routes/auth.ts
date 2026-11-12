import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/signin',
    name: 'Signin',
    component: () => import('@/views/Auth/Signin.vue'),
    meta: {
      title: 'Signin',
      public: true,
    },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('@/views/Auth/Signup.vue'),
    meta: {
      title: 'Signup',
      public: true,
    },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/Auth/ForgotPassword.vue'),
    meta: {
      title: 'Lupa Password',
      public: true,
    },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/Auth/ResetPassword.vue'),
    meta: {
      title: 'Reset Password',
      public: true,
    },
  },
]
