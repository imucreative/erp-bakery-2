import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasPermission } from '@/composables/usePermission'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
    permission?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Ecommerce',
      component: () => import('../views/Ecommerce.vue'),
      meta: {
        title: 'eCommerce Dashboard',
      },
    },
    {
      path: '/master/uoms',
      name: 'Uoms',
      component: () => import('../views/MasterData/UomList.vue'),
      meta: {
        title: 'Units of Measure',
        permission: 'uom.read',
      },
    },
    {
      path: '/master/suppliers',
      name: 'Suppliers',
      component: () => import('../views/MasterData/SupplierList.vue'),
      meta: {
        title: 'Suppliers',
        permission: 'supplier.read',
      },
    },
    {
      path: '/master/product-groups',
      name: 'ProductGroups',
      component: () => import('../views/MasterData/ProductGroupList.vue'),
      meta: {
        title: 'Product Groups',
        permission: 'product-group.read',
      },
    },
    {
      path: '/master/categories',
      name: 'Categories',
      component: () => import('../views/MasterData/CategoryList.vue'),
      meta: {
        title: 'Categories',
        permission: 'category.read',
      },
    },
    {
      path: '/master/products',
      name: 'Products',
      component: () => import('../views/MasterData/ProductList.vue'),
      meta: {
        title: 'Products',
        permission: 'product.read',
      },
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../views/Others/Calendar.vue'),
      meta: {
        title: 'Calendar',
      },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: {
        title: 'Profile',
      },
    },
    {
      path: '/form-elements',
      name: 'Form Elements',
      component: () => import('../views/Forms/FormElements.vue'),
      meta: {
        title: 'Form Elements',
      },
    },
    {
      path: '/basic-tables',
      name: 'Basic Tables',
      component: () => import('../views/Tables/BasicTables.vue'),
      meta: {
        title: 'Basic Tables',
      },
    },
    {
      path: '/line-chart',
      name: 'Line Chart',
      component: () => import('../views/Chart/LineChart/LineChart.vue'),
    },
    {
      path: '/bar-chart',
      name: 'Bar Chart',
      component: () => import('../views/Chart/BarChart/BarChart.vue'),
    },
    {
      path: '/alerts',
      name: 'Alerts',
      component: () => import('../views/UiElements/Alerts.vue'),
      meta: {
        title: 'Alerts',
      },
    },
    {
      path: '/avatars',
      name: 'Avatars',
      component: () => import('../views/UiElements/Avatars.vue'),
      meta: {
        title: 'Avatars',
      },
    },
    {
      path: '/badge',
      name: 'Badge',
      component: () => import('../views/UiElements/Badges.vue'),
      meta: {
        title: 'Badge',
      },
    },

    {
      path: '/buttons',
      name: 'Buttons',
      component: () => import('../views/UiElements/Buttons.vue'),
      meta: {
        title: 'Buttons',
      },
    },

    {
      path: '/images',
      name: 'Images',
      component: () => import('../views/UiElements/Images.vue'),
      meta: {
        title: 'Images',
      },
    },
    {
      path: '/videos',
      name: 'Videos',
      component: () => import('../views/UiElements/Videos.vue'),
      meta: {
        title: 'Videos',
      },
    },
    {
      path: '/blank',
      name: 'Blank',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: {
        title: 'Blank',
      },
    },

    {
      path: '/error-404',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: {
        title: '404 Error',
      },
    },

    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Signin',
        public: true,
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/Auth/Signup.vue'),
      meta: {
        title: 'Signup',
        public: true,
      },
    },
  ],
})

export default router

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title ?? 'Bakery ERP'} | Bakery ERP`

  const auth = useAuthStore()
  const isPublic = to.meta.public === true

  // Authenticated users should not see the auth pages.
  if (isPublic && auth.isAuthenticated && (to.name === 'Signin' || to.name === 'Signup')) {
    return next({ name: 'Ecommerce' })
  }

  // Protected routes require authentication.
  if (!isPublic && !auth.isAuthenticated) {
    return next({ name: 'Signin', query: { redirect: to.fullPath } })
  }

  // Permission-gated routes: redirect to dashboard when the user lacks it.
  const required = to.meta.permission
  if (required && !hasPermission(auth.permissions, auth.isSuperAdmin, required)) {
    return next({ name: 'Ecommerce' })
  }

  return next()
})
