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
      path: '/procurement/purchase-returns',
      name: 'PurchaseReturns',
      component: () => import('../views/Procurement/PurchaseReturnList.vue'),
      meta: {
        title: 'Purchase Returns',
        permission: 'procurement.return.read',
      },
    },
    {
      path: '/procurement/purchase-returns/new',
      name: 'PurchaseReturnCreate',
      component: () => import('../views/Procurement/PurchaseReturnForm.vue'),
      meta: {
        title: 'Buat Purchase Return',
        permission: 'procurement.return.create',
      },
    },
    {
      path: '/procurement/purchase-returns/:id',
      name: 'PurchaseReturnDetail',
      component: () => import('../views/Procurement/PurchaseReturnDetail.vue'),
      meta: {
        title: 'Detail Purchase Return',
        permission: 'procurement.return.read',
      },
    },
    {
      path: '/procurement/purchase-returns/:id/edit',
      name: 'PurchaseReturnEdit',
      component: () => import('../views/Procurement/PurchaseReturnForm.vue'),
      meta: {
        title: 'Edit Purchase Return',
        permission: 'procurement.return.update',
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
      path: '/inventory/batches',
      name: 'InventoryBatches',
      component: () => import('../views/Inventory/BatchList.vue'),
      meta: {
        title: 'Batch & Expiry',
        permission: 'inventory.read',
      },
    },
    {
      path: '/inventory/adjustments',
      name: 'InventoryStockAdjustments',
      component: () => import('../views/Inventory/StockAdjustmentList.vue'),
      meta: {
        title: 'Stock Adjustments',
        permission: 'inventory.adjustment.read',
      },
    },
    {
      path: '/inventory/adjustments/create',
      name: 'InventoryStockAdjustmentCreate',
      component: () => import('../views/Inventory/StockAdjustmentForm.vue'),
      meta: {
        title: 'Buat Stock Adjustment',
        permission: 'inventory.adjustment.create',
      },
    },
    {
      path: '/inventory/adjustments/:id',
      name: 'InventoryStockAdjustmentDetail',
      component: () => import('../views/Inventory/StockAdjustmentDetail.vue'),
      meta: {
        title: 'Detail Stock Adjustment',
        permission: 'inventory.adjustment.read',
      },
    },
    {
      path: '/inventory/adjustments/:id/edit',
      name: 'InventoryStockAdjustmentEdit',
      component: () => import('../views/Inventory/StockAdjustmentForm.vue'),
      meta: {
        title: 'Edit Stock Adjustment',
        permission: 'inventory.adjustment.update',
      },
    },
    {
      path: '/inventory/stock-counts',
      name: 'InventoryStockOpnames',
      component: () => import('../views/Inventory/StockOpnameList.vue'),
      meta: {
        title: 'Stock Opname',
        permission: 'inventory.stock-count.read',
      },
    },
    {
      path: '/inventory/stock-counts/create',
      name: 'InventoryStockOpnameCreate',
      component: () => import('../views/Inventory/StockOpnameForm.vue'),
      meta: {
        title: 'Buat Stock Opname',
        permission: 'inventory.stock-count.create',
      },
    },
    {
      path: '/inventory/stock-counts/:id',
      name: 'InventoryStockOpnameDetail',
      component: () => import('../views/Inventory/StockOpnameDetail.vue'),
      meta: {
        title: 'Detail Stock Opname',
        permission: 'inventory.stock-count.read',
      },
    },
    {
      path: '/inventory/transfers',
      name: 'InventoryStockTransfers',
      component: () => import('../views/Inventory/StockTransferList.vue'),
      meta: {
        title: 'Stock Transfer',
        permission: 'inventory.transfer.read',
      },
    },
    {
      path: '/inventory/transfers/create',
      name: 'InventoryStockTransferCreate',
      component: () => import('../views/Inventory/StockTransferForm.vue'),
      meta: {
        title: 'Buat Transfer Stok',
        permission: 'inventory.transfer.create',
      },
    },
    {
      path: '/inventory/transfers/:id',
      name: 'InventoryStockTransferDetail',
      component: () => import('../views/Inventory/StockTransferDetail.vue'),
      meta: {
        title: 'Detail Transfer Stok',
        permission: 'inventory.transfer.read',
      },
    },
    {
      path: '/inventory/transfers/:id/edit',
      name: 'InventoryStockTransferEdit',
      component: () => import('../views/Inventory/StockTransferForm.vue'),
      meta: {
        title: 'Edit Transfer Stok',
        permission: 'inventory.transfer.create',
      },
    },
    {
      path: '/production/recipes',
      name: 'ProductionRecipes',
      component: () => import('../views/Production/RecipeList.vue'),
      meta: {
        title: 'Recipe',
        permission: 'recipe.read',
      },
    },
    {
      path: '/production/recipes/create',
      name: 'ProductionRecipeCreate',
      component: () => import('../views/Production/RecipeForm.vue'),
      meta: {
        title: 'Buat Resep',
        permission: 'recipe.manage',
      },
    },
    {
      path: '/production/recipes/:id/edit',
      name: 'ProductionRecipeEdit',
      component: () => import('../views/Production/RecipeForm.vue'),
      meta: {
        title: 'Edit Resep',
        permission: 'recipe.manage',
      },
    },
    {
      path: '/production/recipes/:id',
      name: 'ProductionRecipeDetail',
      component: () => import('../views/Production/RecipeDetail.vue'),
      meta: {
        title: 'Detail Resep',
        permission: 'recipe.read',
      },
    },
    {
      path: '/production/orders',
      name: 'ProductionOrders',
      component: () => import('../views/Production/ProductionOrderList.vue'),
      meta: {
        title: 'Production Orders',
        permission: 'production-order.read',
      },
    },
    {
      path: '/production/orders/create',
      name: 'ProductionOrderCreate',
      component: () => import('../views/Production/ProductionOrderForm.vue'),
      meta: {
        title: 'Produksi',
        permission: 'production-order.manage',
      },
    },
    {
      path: '/production/orders/:id',
      name: 'ProductionOrderDetail',
      component: () => import('../views/Production/ProductionOrderDetail.vue'),
      meta: {
        title: 'Detail Production Order',
        permission: 'production-order.read',
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
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: {
        title: 'Profile',
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
