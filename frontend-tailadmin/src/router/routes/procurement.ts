import type { RouteRecordRaw } from 'vue-router'

export const procurementRoutes: RouteRecordRaw[] = [
  {
    path: '/procurement/purchase-requests',
    name: 'PurchaseRequests',
    component: () => import('@/views/Procurement/PurchaseRequestList.vue'),
    meta: {
      title: 'Purchase Requests',
      permission: 'procurement.pr.read',
    },
  },
  {
    path: '/procurement/purchase-requests/new',
    name: 'PurchaseRequestCreate',
    component: () => import('@/views/Procurement/PurchaseRequestForm.vue'),
    meta: {
      title: 'Buat Purchase Request',
      permission: 'procurement.pr.create',
    },
  },
  {
    path: '/procurement/purchase-requests/:id',
    name: 'PurchaseRequestDetail',
    component: () => import('@/views/Procurement/PurchaseRequestDetail.vue'),
    meta: {
      title: 'Detail Purchase Request',
      permission: 'procurement.pr.read',
    },
  },
  {
    path: '/procurement/purchase-requests/:id/edit',
    name: 'PurchaseRequestEdit',
    component: () => import('@/views/Procurement/PurchaseRequestForm.vue'),
    meta: {
      title: 'Edit Purchase Request',
      permission: 'procurement.pr.update',
    },
  },
  {
    path: '/procurement/purchase-orders',
    name: 'PurchaseOrders',
    component: () => import('@/views/Procurement/PurchaseOrderList.vue'),
    meta: {
      title: 'Purchase Orders',
      permission: 'procurement.po.read',
    },
  },
  {
    path: '/procurement/purchase-orders/new',
    name: 'PurchaseOrderCreate',
    component: () => import('@/views/Procurement/PurchaseOrderForm.vue'),
    meta: {
      title: 'Buat Purchase Order',
      permission: 'procurement.po.create',
    },
  },
  {
    path: '/procurement/purchase-orders/:id',
    name: 'PurchaseOrderDetail',
    component: () => import('@/views/Procurement/PurchaseOrderDetail.vue'),
    meta: {
      title: 'Detail Purchase Order',
      permission: 'procurement.po.read',
    },
  },
  {
    path: '/procurement/purchase-orders/:id/edit',
    name: 'PurchaseOrderEdit',
    component: () => import('@/views/Procurement/PurchaseOrderForm.vue'),
    meta: {
      title: 'Edit Purchase Order',
      permission: 'procurement.po.update',
    },
  },
  {
    path: '/procurement/goods-receipts',
    name: 'GoodsReceipts',
    component: () => import('@/views/Procurement/GoodsReceiptList.vue'),
    meta: {
      title: 'Goods Receipts',
      permission: 'procurement.gr.read',
    },
  },
  {
    path: '/procurement/goods-receipts/new',
    name: 'GoodsReceiptCreate',
    component: () => import('@/views/Procurement/GoodsReceiptForm.vue'),
    meta: {
      title: 'Buat Goods Receipt',
      permission: 'procurement.gr.create',
    },
  },
  {
    path: '/procurement/goods-receipts/:id',
    name: 'GoodsReceiptDetail',
    component: () => import('@/views/Procurement/GoodsReceiptDetail.vue'),
    meta: {
      title: 'Detail Goods Receipt',
      permission: 'procurement.gr.read',
    },
  },
  {
    path: '/procurement/goods-receipts/:id/edit',
    name: 'GoodsReceiptEdit',
    component: () => import('@/views/Procurement/GoodsReceiptForm.vue'),
    meta: {
      title: 'Edit Goods Receipt',
      permission: 'procurement.gr.update',
    },
  },
  {
    path: '/procurement/purchase-returns',
    name: 'PurchaseReturns',
    component: () => import('@/views/Procurement/PurchaseReturnList.vue'),
    meta: {
      title: 'Purchase Returns',
      permission: 'procurement.return.read',
    },
  },
  {
    path: '/procurement/purchase-returns/new',
    name: 'PurchaseReturnCreate',
    component: () => import('@/views/Procurement/PurchaseReturnForm.vue'),
    meta: {
      title: 'Buat Purchase Return',
      permission: 'procurement.return.create',
    },
  },
  {
    path: '/procurement/purchase-returns/:id',
    name: 'PurchaseReturnDetail',
    component: () => import('@/views/Procurement/PurchaseReturnDetail.vue'),
    meta: {
      title: 'Detail Purchase Return',
      permission: 'procurement.return.read',
    },
  },
  {
    path: '/procurement/purchase-returns/:id/edit',
    name: 'PurchaseReturnEdit',
    component: () => import('@/views/Procurement/PurchaseReturnForm.vue'),
    meta: {
      title: 'Edit Purchase Return',
      permission: 'procurement.return.update',
    },
  },
]
