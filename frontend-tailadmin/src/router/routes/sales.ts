import type { RouteRecordRaw } from 'vue-router'

export const salesRoutes: RouteRecordRaw[] = [
  {
    path: '/sales/pos',
    name: 'PosTerminal',
    component: () => import('@/views/Sales/PosTerminal.vue'),
    meta: {
      title: 'Point of Sale',
      permission: 'sales.manage',
    },
  },
  {
    path: '/sales/shifts',
    name: 'Shifts',
    component: () => import('@/views/Sales/ShiftList.vue'),
    meta: {
      title: 'Shift Kasir',
      permission: 'shift.read',
    },
  },
  {
    path: '/sales/orders',
    name: 'SalesOrders',
    component: () => import('@/views/Sales/SalesOrderList.vue'),
    meta: {
      title: 'Sales Orders',
      permission: 'sales.read',
    },
  },
  {
    path: '/sales/orders/:id',
    name: 'SalesOrderDetail',
    component: () => import('@/views/Sales/SalesOrderDetail.vue'),
    meta: {
      title: 'Detail Sales Order',
      permission: 'sales.read',
    },
  },
]
