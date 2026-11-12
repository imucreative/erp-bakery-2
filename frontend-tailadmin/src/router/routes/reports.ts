import type { RouteRecordRaw } from 'vue-router'

export const reportsRoutes: RouteRecordRaw[] = [
  {
    path: '/reports/sales',
    name: 'ReportsSales',
    component: () => import('@/views/Reports/SalesReport.vue'),
    meta: {
      title: 'Sales Report',
      permission: 'reports.read',
    },
  },
  {
    path: '/reports/inventory',
    name: 'ReportsInventory',
    component: () => import('@/views/Reports/InventoryReport.vue'),
    meta: {
      title: 'Inventory Report',
      permission: 'reports.read',
    },
  },
  {
    path: '/reports/production',
    name: 'ReportsProduction',
    component: () => import('@/views/Reports/ProductionReport.vue'),
    meta: {
      title: 'Production Report',
      permission: 'reports.read',
    },
  },
]
