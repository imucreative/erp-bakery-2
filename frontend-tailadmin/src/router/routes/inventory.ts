import type { RouteRecordRaw } from 'vue-router'

export const inventoryRoutes: RouteRecordRaw[] = [
  {
    path: '/inventory/stock-on-hand',
    name: 'InventoryStockOnHand',
    component: () => import('@/views/Inventory/StockOnHandList.vue'),
    meta: {
      title: 'Stock On Hand',
      permission: 'inventory.read',
    },
  },
  {
    path: '/inventory/ledger',
    name: 'InventoryStockLedger',
    component: () => import('@/views/Inventory/StockLedgerList.vue'),
    meta: {
      title: 'Stock Ledger',
      permission: 'inventory.read',
    },
  },
  {
    path: '/inventory/batches',
    name: 'InventoryBatches',
    component: () => import('@/views/Inventory/BatchList.vue'),
    meta: {
      title: 'Batch & Expiry',
      permission: 'inventory.read',
    },
  },
  {
    path: '/inventory/adjustments',
    name: 'InventoryStockAdjustments',
    component: () => import('@/views/Inventory/StockAdjustmentList.vue'),
    meta: {
      title: 'Stock Adjustments',
      permission: 'inventory.adjustment.read',
    },
  },
  {
    path: '/inventory/adjustments/create',
    name: 'InventoryStockAdjustmentCreate',
    component: () => import('@/views/Inventory/StockAdjustmentForm.vue'),
    meta: {
      title: 'Buat Stock Adjustment',
      permission: 'inventory.adjustment.create',
    },
  },
  {
    path: '/inventory/adjustments/:id',
    name: 'InventoryStockAdjustmentDetail',
    component: () => import('@/views/Inventory/StockAdjustmentDetail.vue'),
    meta: {
      title: 'Detail Stock Adjustment',
      permission: 'inventory.adjustment.read',
    },
  },
  {
    path: '/inventory/adjustments/:id/edit',
    name: 'InventoryStockAdjustmentEdit',
    component: () => import('@/views/Inventory/StockAdjustmentForm.vue'),
    meta: {
      title: 'Edit Stock Adjustment',
      permission: 'inventory.adjustment.update',
    },
  },
  {
    path: '/inventory/stock-counts',
    name: 'InventoryStockOpnames',
    component: () => import('@/views/Inventory/StockOpnameList.vue'),
    meta: {
      title: 'Stock Opname',
      permission: 'inventory.stock-count.read',
    },
  },
  {
    path: '/inventory/stock-counts/create',
    name: 'InventoryStockOpnameCreate',
    component: () => import('@/views/Inventory/StockOpnameForm.vue'),
    meta: {
      title: 'Buat Stock Opname',
      permission: 'inventory.stock-count.create',
    },
  },
  {
    path: '/inventory/stock-counts/:id',
    name: 'InventoryStockOpnameDetail',
    component: () => import('@/views/Inventory/StockOpnameDetail.vue'),
    meta: {
      title: 'Detail Stock Opname',
      permission: 'inventory.stock-count.read',
    },
  },
  {
    path: '/inventory/transfers',
    name: 'InventoryStockTransfers',
    component: () => import('@/views/Inventory/StockTransferList.vue'),
    meta: {
      title: 'Stock Transfer',
      permission: 'inventory.transfer.read',
    },
  },
  {
    path: '/inventory/transfers/create',
    name: 'InventoryStockTransferCreate',
    component: () => import('@/views/Inventory/StockTransferForm.vue'),
    meta: {
      title: 'Buat Transfer Stok',
      permission: 'inventory.transfer.create',
    },
  },
  {
    path: '/inventory/transfers/:id',
    name: 'InventoryStockTransferDetail',
    component: () => import('@/views/Inventory/StockTransferDetail.vue'),
    meta: {
      title: 'Detail Transfer Stok',
      permission: 'inventory.transfer.read',
    },
  },
  {
    path: '/inventory/transfers/:id/edit',
    name: 'InventoryStockTransferEdit',
    component: () => import('@/views/Inventory/StockTransferForm.vue'),
    meta: {
      title: 'Edit Transfer Stok',
      permission: 'inventory.transfer.create',
    },
  },
]
