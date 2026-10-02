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
      path: '/master/outlets',
      name: 'Outlets',
      component: () => import('../views/MasterData/OutletList.vue'),
      meta: {
        title: 'Outlets',
        permission: 'outlet.read',
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
      path: '/master/payment-terms',
      name: 'PaymentTerms',
      component: () => import('../views/MasterData/PaymentTermList.vue'),
      meta: {
        title: 'Payment Terms',
        permission: 'payment-term.read',
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
      path: '/procurement/purchase-requests',
      name: 'PurchaseRequests',
      component: () => import('../views/Procurement/PurchaseRequestList.vue'),
      meta: {
        title: 'Purchase Requests',
        permission: 'procurement.pr.read',
      },
    },
    {
      path: '/procurement/purchase-requests/new',
      name: 'PurchaseRequestCreate',
      component: () => import('../views/Procurement/PurchaseRequestForm.vue'),
      meta: {
        title: 'Buat Purchase Request',
        permission: 'procurement.pr.create',
      },
    },
    {
      path: '/procurement/purchase-requests/:id',
      name: 'PurchaseRequestDetail',
      component: () => import('../views/Procurement/PurchaseRequestDetail.vue'),
      meta: {
        title: 'Detail Purchase Request',
        permission: 'procurement.pr.read',
      },
    },
    {
      path: '/procurement/purchase-requests/:id/edit',
      name: 'PurchaseRequestEdit',
      component: () => import('../views/Procurement/PurchaseRequestForm.vue'),
      meta: {
        title: 'Edit Purchase Request',
        permission: 'procurement.pr.update',
      },
    },
    {
      path: '/procurement/purchase-orders',
      name: 'PurchaseOrders',
      component: () => import('../views/Procurement/PurchaseOrderList.vue'),
      meta: {
        title: 'Purchase Orders',
        permission: 'procurement.po.read',
      },
    },
    {
      path: '/procurement/purchase-orders/new',
      name: 'PurchaseOrderCreate',
      component: () => import('../views/Procurement/PurchaseOrderForm.vue'),
      meta: {
        title: 'Buat Purchase Order',
        permission: 'procurement.po.create',
      },
    },
    {
      path: '/procurement/purchase-orders/:id',
      name: 'PurchaseOrderDetail',
      component: () => import('../views/Procurement/PurchaseOrderDetail.vue'),
      meta: {
        title: 'Detail Purchase Order',
        permission: 'procurement.po.read',
      },
    },
    {
      path: '/procurement/purchase-orders/:id/edit',
      name: 'PurchaseOrderEdit',
      component: () => import('../views/Procurement/PurchaseOrderForm.vue'),
      meta: {
        title: 'Edit Purchase Order',
        permission: 'procurement.po.update',
      },
    },
    {
      path: '/procurement/goods-receipts',
      name: 'GoodsReceipts',
      component: () => import('../views/Procurement/GoodsReceiptList.vue'),
      meta: {
        title: 'Goods Receipts',
        permission: 'procurement.gr.read',
      },
    },
    {
      path: '/procurement/goods-receipts/new',
      name: 'GoodsReceiptCreate',
      component: () => import('../views/Procurement/GoodsReceiptForm.vue'),
      meta: {
        title: 'Buat Goods Receipt',
        permission: 'procurement.gr.create',
      },
    },
    {
      path: '/procurement/goods-receipts/:id',
      name: 'GoodsReceiptDetail',
      component: () => import('../views/Procurement/GoodsReceiptDetail.vue'),
      meta: {
        title: 'Detail Goods Receipt',
        permission: 'procurement.gr.read',
      },
    },
    {
      path: '/procurement/goods-receipts/:id/edit',
      name: 'GoodsReceiptEdit',
      component: () => import('../views/Procurement/GoodsReceiptForm.vue'),
      meta: {
        title: 'Edit Goods Receipt',
        permission: 'procurement.gr.update',
      },
    },
    {
      path: '/inventory/stock-on-hand',
      name: 'InventoryStockOnHand',
      component: () => import('../views/Inventory/StockOnHandList.vue'),
      meta: {
        title: 'Stock On Hand',
        permission: 'inventory.read',
      },
    },
    {
      path: '/inventory/ledger',
      name: 'InventoryStockLedger',
      component: () => import('../views/Inventory/StockLedgerList.vue'),
      meta: {
        title: 'Stock Ledger',
        permission: 'inventory.read',
      },
    },
    {
      path: '/system/users',
      name: 'Users',
      component: () => import('../views/System/UserList.vue'),
      meta: {
        title: 'Users',
        permission: 'user.read',
      },
    },
    {
      path: '/system/roles',
      name: 'Roles',
      component: () => import('../views/System/RoleList.vue'),
      meta: {
        title: 'Roles',
        permission: 'role.read',
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
