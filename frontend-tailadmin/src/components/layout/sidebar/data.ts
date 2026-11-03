import {
  BarChart3,
  Boxes,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Users,
} from 'lucide-vue-next'

import { isRouteActive } from '@/lib/route'
import type { NavGroup, OpenSubmenu } from './types'

export const menuGroups: NavGroup[] = [
  {
    title: 'Menu',
    items: [
      {
        icon: LayoutDashboard,
        name: 'Dashboard',
        path: '/dashboard',
        permission: 'dashboard.read',
      },
      {
        icon: ShoppingBag,
        name: 'Sales',
        subItems: [
          { name: 'Point of Sale (POS)', path: '/sales/pos', permission: 'sales.manage' },
          { name: 'History Sales', path: '/sales/orders', permission: 'sales.read' },
          { name: 'Shift Kasir', path: '/sales/shifts', permission: 'shift.read' },
        ],
      },
      {
        icon: Factory,
        name: 'Production',
        subItems: [
          { name: 'Recipe', path: '/production/recipes', permission: 'recipe.read' },
          {
            name: 'Production Orders',
            path: '/production/orders',
            permission: 'production-order.read',
          },
        ],
      },
      {
        icon: Boxes,
        name: 'Inventory',
        subItems: [
          { name: 'Stock On Hand', path: '/inventory/stock-on-hand', permission: 'inventory.read' },
          { name: 'Stock Ledger', path: '/inventory/ledger', permission: 'inventory.read' },
          { name: 'Batch & Expiry', path: '/inventory/batches', permission: 'inventory.read' },
          {
            name: 'Stock Adjustment',
            path: '/inventory/adjustments',
            permission: 'inventory.adjustment.read',
          },
          {
            name: 'Stock Opname',
            path: '/inventory/stock-counts',
            permission: 'inventory.stock-count.read',
          },
          {
            name: 'Stock Transfer',
            path: '/inventory/transfers',
            permission: 'inventory.transfer.read',
          },
        ],
      },
      {
        icon: ClipboardList,
        name: 'Procurement',
        subItems: [
          {
            name: 'Purchase Requests',
            path: '/procurement/purchase-requests',
            permission: 'procurement.pr.read',
          },
          {
            name: 'Purchase Orders',
            path: '/procurement/purchase-orders',
            permission: 'procurement.po.read',
          },
          {
            name: 'Goods Receipts',
            path: '/procurement/goods-receipts',
            permission: 'procurement.gr.read',
          },
          {
            name: 'Purchase Return',
            path: '/procurement/purchase-returns',
            permission: 'procurement.return.read',
          },
        ],
      },
      {
        icon: Package,
        name: 'Master Data',
        subItems: [
          { name: 'Products', path: '/master/products', permission: 'product.read' },
          { name: 'Toppings', path: '/master/toppings', permission: 'product.read' },
          {
            name: 'Product Groups',
            path: '/master/product-groups',
            permission: 'product-group.read',
          },
          { name: 'Categories', path: '/master/categories', permission: 'category.read' },
          { name: 'Units of Measure', path: '/master/uoms', permission: 'uom.read' },
          { name: 'Suppliers', path: '/master/suppliers', permission: 'supplier.read' },
          {
            name: 'Payment Terms',
            path: '/master/payment-terms',
            permission: 'payment-term.read',
          },
          { name: 'Outlets', path: '/master/outlets', permission: 'outlet.read' },
        ],
      },
      {
        icon: ReceiptText,
        name: 'Finance',
        new: true,
        subItems: [
          { name: 'Vendor Invoice', path: '/error-404', soon: true },
          { name: 'Accounts Payable', path: '/error-404', soon: true },
        ],
      },
      {
        icon: BarChart3,
        name: 'Reports',
        subItems: [
          { name: 'Sales Report', path: '/reports/sales', permission: 'reports.read' },
          { name: 'Inventory Report', path: '/reports/inventory', permission: 'reports.read' },
          { name: 'Production Report', path: '/reports/production', permission: 'reports.read' },
        ],
      },
    ],
  },
  {
    title: 'Pengaturan',
    items: [
      {
        icon: Users,
        name: 'Users',
        path: '/system/users',
        permission: 'user.read',
      },
      {
        icon: ShieldCheck,
        name: 'Roles',
        path: '/system/roles',
        permission: 'role.read',
      },
    ],
  },
]

/** Item ber-submenu yang memuat route saat ini, dipakai untuk auto-buka submenu. */
export function findActiveSubmenu(groups: NavGroup[], currentPath: string): OpenSubmenu | null {
  for (const group of groups) {
    const itemIndex = group.items.findIndex((item) =>
      item.subItems?.some((subItem) => isRouteActive(subItem.path, currentPath)),
    )

    if (itemIndex !== -1) {
      return { groupTitle: group.title, itemIndex }
    }
  }

  return null
}
