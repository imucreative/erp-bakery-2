/**
 * Permissions Seed
 * Source of truth: knowledge-base/16.role-permission-matrix.md
 *
 * Run: npx ts-node src/Infrastructures/database/seeds/run-seed.ts
 */

export interface PermissionSeedRow {
  code: string;
  name: string;
  domain: string;
  module_key: string;
  module_name: string;
  action: string;
  sort_order: number;
}

export const PERMISSIONS: PermissionSeedRow[] = [
  // ── 7.1 System Administration ────────────────────────────────────────────
  { code: 'user.read', name: 'View Users', domain: 'system-administration', module_key: 'user', module_name: 'User', action: 'read', sort_order: 10 },
  { code: 'user.manage', name: 'Manage Users', domain: 'system-administration', module_key: 'user', module_name: 'User', action: 'manage', sort_order: 11 },
  { code: 'role.read', name: 'View Roles', domain: 'system-administration', module_key: 'role', module_name: 'Role', action: 'read', sort_order: 20 },
  { code: 'role.manage', name: 'Manage Roles', domain: 'system-administration', module_key: 'role', module_name: 'Role', action: 'manage', sort_order: 21 },
  { code: 'permission.read', name: 'View Permissions', domain: 'system-administration', module_key: 'permission', module_name: 'Permission', action: 'read', sort_order: 30 },
  { code: 'permission.manage', name: 'Manage Permissions', domain: 'system-administration', module_key: 'permission', module_name: 'Permission', action: 'manage', sort_order: 31 },
  { code: 'audit.read', name: 'View Audit Logs', domain: 'system-administration', module_key: 'audit', module_name: 'Audit', action: 'read', sort_order: 40 },
  { code: 'auth.manage', name: 'Manage Authentication', domain: 'system-administration', module_key: 'auth', module_name: 'Authentication', action: 'manage', sort_order: 50 },

  // ── 7.2 Master Data ───────────────────────────────────────────────────────
  { code: 'outlet.read', name: 'View Outlets', domain: 'master-data', module_key: 'outlet', module_name: 'Outlet', action: 'read', sort_order: 100 },
  { code: 'outlet.manage', name: 'Manage Outlets', domain: 'master-data', module_key: 'outlet', module_name: 'Outlet', action: 'manage', sort_order: 101 },
  { code: 'supplier.read', name: 'View Suppliers', domain: 'master-data', module_key: 'supplier', module_name: 'Supplier', action: 'read', sort_order: 110 },
  { code: 'supplier.manage', name: 'Manage Suppliers', domain: 'master-data', module_key: 'supplier', module_name: 'Supplier', action: 'manage', sort_order: 111 },
  { code: 'payment-term.read', name: 'View Payment Terms', domain: 'master-data', module_key: 'payment-term', module_name: 'Payment Term', action: 'read', sort_order: 120 },
  { code: 'payment-term.manage', name: 'Manage Payment Terms', domain: 'master-data', module_key: 'payment-term', module_name: 'Payment Term', action: 'manage', sort_order: 121 },
  { code: 'category.read', name: 'View Categories', domain: 'master-data', module_key: 'category', module_name: 'Category', action: 'read', sort_order: 130 },
  { code: 'category.manage', name: 'Manage Categories', domain: 'master-data', module_key: 'category', module_name: 'Category', action: 'manage', sort_order: 131 },
  { code: 'product-group.read', name: 'View Product Groups', domain: 'master-data', module_key: 'product-group', module_name: 'Product Group', action: 'read', sort_order: 140 },
  { code: 'product-group.manage', name: 'Manage Product Groups', domain: 'master-data', module_key: 'product-group', module_name: 'Product Group', action: 'manage', sort_order: 141 },
  { code: 'uom.read', name: 'View Units of Measure', domain: 'master-data', module_key: 'uom', module_name: 'UOM', action: 'read', sort_order: 150 },
  { code: 'uom.manage', name: 'Manage Units of Measure', domain: 'master-data', module_key: 'uom', module_name: 'UOM', action: 'manage', sort_order: 151 },
  { code: 'product.read', name: 'View Products', domain: 'master-data', module_key: 'product', module_name: 'Product', action: 'read', sort_order: 160 },
  { code: 'product.manage', name: 'Manage Products', domain: 'master-data', module_key: 'product', module_name: 'Product', action: 'manage', sort_order: 161 },

  // ── 7.3 Procurement ───────────────────────────────────────────────────────
  { code: 'procurement.pr.read', name: 'View Purchase Requests', domain: 'procurement', module_key: 'purchase-request', module_name: 'Purchase Request', action: 'read', sort_order: 200 },
  { code: 'procurement.pr.create', name: 'Create Purchase Requests', domain: 'procurement', module_key: 'purchase-request', module_name: 'Purchase Request', action: 'create', sort_order: 201 },
  { code: 'procurement.pr.update', name: 'Update Purchase Requests', domain: 'procurement', module_key: 'purchase-request', module_name: 'Purchase Request', action: 'update', sort_order: 202 },
  { code: 'procurement.pr.approve', name: 'Approve Purchase Requests', domain: 'procurement', module_key: 'purchase-request', module_name: 'Purchase Request', action: 'approve', sort_order: 203 },
  { code: 'procurement.pr.manage', name: 'Manage Purchase Requests', domain: 'procurement', module_key: 'purchase-request', module_name: 'Purchase Request', action: 'manage', sort_order: 204 },
  { code: 'procurement.po.read', name: 'View Purchase Orders', domain: 'procurement', module_key: 'purchase-order', module_name: 'Purchase Order', action: 'read', sort_order: 210 },
  { code: 'procurement.po.create', name: 'Create Purchase Orders', domain: 'procurement', module_key: 'purchase-order', module_name: 'Purchase Order', action: 'create', sort_order: 211 },
  { code: 'procurement.po.update', name: 'Update Purchase Orders', domain: 'procurement', module_key: 'purchase-order', module_name: 'Purchase Order', action: 'update', sort_order: 212 },
  { code: 'procurement.po.approve', name: 'Approve Purchase Orders', domain: 'procurement', module_key: 'purchase-order', module_name: 'Purchase Order', action: 'approve', sort_order: 213 },
  { code: 'procurement.po.manage', name: 'Manage Purchase Orders', domain: 'procurement', module_key: 'purchase-order', module_name: 'Purchase Order', action: 'manage', sort_order: 214 },
  { code: 'procurement.gr.read', name: 'View Goods Receipts', domain: 'procurement', module_key: 'goods-receipt', module_name: 'Goods Receipt', action: 'read', sort_order: 220 },
  { code: 'procurement.gr.create', name: 'Create Goods Receipts', domain: 'procurement', module_key: 'goods-receipt', module_name: 'Goods Receipt', action: 'create', sort_order: 221 },
  { code: 'procurement.gr.update', name: 'Update Goods Receipts', domain: 'procurement', module_key: 'goods-receipt', module_name: 'Goods Receipt', action: 'update', sort_order: 222 },
  { code: 'procurement.gr.complete', name: 'Complete Goods Receipts', domain: 'procurement', module_key: 'goods-receipt', module_name: 'Goods Receipt', action: 'complete', sort_order: 223 },
  { code: 'procurement.gr.manage', name: 'Manage Goods Receipts', domain: 'procurement', module_key: 'goods-receipt', module_name: 'Goods Receipt', action: 'manage', sort_order: 224 },
  { code: 'procurement.return.read', name: 'View Purchase Returns', domain: 'procurement', module_key: 'purchase-return', module_name: 'Purchase Return', action: 'read', sort_order: 230 },
  { code: 'procurement.return.create', name: 'Create Purchase Returns', domain: 'procurement', module_key: 'purchase-return', module_name: 'Purchase Return', action: 'create', sort_order: 231 },
  { code: 'procurement.return.update', name: 'Update Purchase Returns', domain: 'procurement', module_key: 'purchase-return', module_name: 'Purchase Return', action: 'update', sort_order: 232 },
  { code: 'procurement.return.complete', name: 'Complete Purchase Returns', domain: 'procurement', module_key: 'purchase-return', module_name: 'Purchase Return', action: 'complete', sort_order: 233 },
  { code: 'procurement.return.manage', name: 'Manage Purchase Returns', domain: 'procurement', module_key: 'purchase-return', module_name: 'Purchase Return', action: 'manage', sort_order: 234 },

  // ── 7.4 Inventory ─────────────────────────────────────────────────────────
  { code: 'inventory.read', name: 'View Inventory', domain: 'inventory', module_key: 'inventory', module_name: 'Inventory', action: 'read', sort_order: 300 },
  { code: 'inventory.manage', name: 'Manage Inventory', domain: 'inventory', module_key: 'inventory', module_name: 'Inventory', action: 'manage', sort_order: 301 },
  { code: 'inventory.adjustment.read', name: 'View Stock Adjustments', domain: 'inventory', module_key: 'stock-adjustment', module_name: 'Stock Adjustment', action: 'read', sort_order: 310 },
  { code: 'inventory.adjustment.create', name: 'Create Stock Adjustments', domain: 'inventory', module_key: 'stock-adjustment', module_name: 'Stock Adjustment', action: 'create', sort_order: 311 },
  { code: 'inventory.adjustment.update', name: 'Update Stock Adjustments', domain: 'inventory', module_key: 'stock-adjustment', module_name: 'Stock Adjustment', action: 'update', sort_order: 312 },
  { code: 'inventory.adjustment.approve', name: 'Approve Stock Adjustments', domain: 'inventory', module_key: 'stock-adjustment', module_name: 'Stock Adjustment', action: 'approve', sort_order: 313 },
  { code: 'inventory.adjustment.complete', name: 'Complete Stock Adjustments', domain: 'inventory', module_key: 'stock-adjustment', module_name: 'Stock Adjustment', action: 'complete', sort_order: 314 },
  { code: 'inventory.adjustment.manage', name: 'Manage Stock Adjustments', domain: 'inventory', module_key: 'stock-adjustment', module_name: 'Stock Adjustment', action: 'manage', sort_order: 315 },
  { code: 'inventory.stock-count.read', name: 'View Stock Opnames', domain: 'inventory', module_key: 'stock-opname', module_name: 'Stock Opname', action: 'read', sort_order: 320 },
  { code: 'inventory.stock-count.create', name: 'Create Stock Opnames', domain: 'inventory', module_key: 'stock-opname', module_name: 'Stock Opname', action: 'create', sort_order: 321 },
  { code: 'inventory.stock-count.update', name: 'Update Stock Opnames', domain: 'inventory', module_key: 'stock-opname', module_name: 'Stock Opname', action: 'update', sort_order: 322 },
  { code: 'inventory.stock-count.approve', name: 'Approve Stock Opnames', domain: 'inventory', module_key: 'stock-opname', module_name: 'Stock Opname', action: 'approve', sort_order: 323 },
  { code: 'inventory.stock-count.complete', name: 'Complete Stock Opnames', domain: 'inventory', module_key: 'stock-opname', module_name: 'Stock Opname', action: 'complete', sort_order: 324 },
  { code: 'inventory.stock-count.manage', name: 'Manage Stock Opnames', domain: 'inventory', module_key: 'stock-opname', module_name: 'Stock Opname', action: 'manage', sort_order: 325 },
  { code: 'inventory.transfer.read', name: 'View Stock Transfers', domain: 'inventory', module_key: 'stock-transfer', module_name: 'Stock Transfer', action: 'read', sort_order: 330 },
  { code: 'inventory.transfer.create', name: 'Create Stock Transfers', domain: 'inventory', module_key: 'stock-transfer', module_name: 'Stock Transfer', action: 'create', sort_order: 331 },
  { code: 'inventory.transfer.update', name: 'Update Stock Transfers', domain: 'inventory', module_key: 'stock-transfer', module_name: 'Stock Transfer', action: 'update', sort_order: 332 },
  { code: 'inventory.transfer.dispatch', name: 'Dispatch Stock Transfers', domain: 'inventory', module_key: 'stock-transfer', module_name: 'Stock Transfer', action: 'dispatch', sort_order: 333 },
  { code: 'inventory.transfer.receive', name: 'Receive Stock Transfers', domain: 'inventory', module_key: 'stock-transfer', module_name: 'Stock Transfer', action: 'receive', sort_order: 334 },
  { code: 'inventory.transfer.manage', name: 'Manage Stock Transfers', domain: 'inventory', module_key: 'stock-transfer', module_name: 'Stock Transfer', action: 'manage', sort_order: 335 },
  { code: 'replenishment.read', name: 'View Replenishments', domain: 'inventory', module_key: 'replenishment', module_name: 'Replenishment', action: 'read', sort_order: 340 },
  { code: 'replenishment.manage', name: 'Manage Replenishments', domain: 'inventory', module_key: 'replenishment', module_name: 'Replenishment', action: 'manage', sort_order: 341 },

  // ── 7.5 Production ────────────────────────────────────────────────────────
  { code: 'recipe.read', name: 'View Recipes', domain: 'production', module_key: 'recipe', module_name: 'Recipe', action: 'read', sort_order: 400 },
  { code: 'recipe.manage', name: 'Manage Recipes', domain: 'production', module_key: 'recipe', module_name: 'Recipe', action: 'manage', sort_order: 401 },
  { code: 'bom.read', name: 'View Bill of Materials', domain: 'production', module_key: 'bom', module_name: 'BOM', action: 'read', sort_order: 410 },
  { code: 'bom.manage', name: 'Manage Bill of Materials', domain: 'production', module_key: 'bom', module_name: 'BOM', action: 'manage', sort_order: 411 },
  { code: 'production.read', name: 'View Production', domain: 'production', module_key: 'production', module_name: 'Production', action: 'read', sort_order: 420 },
  { code: 'production.manage', name: 'Manage Production', domain: 'production', module_key: 'production', module_name: 'Production', action: 'manage', sort_order: 421 },
  { code: 'production-order.read', name: 'View Production Orders', domain: 'production', module_key: 'production-order', module_name: 'Production Order', action: 'read', sort_order: 430 },
  { code: 'production-order.manage', name: 'Manage Production Orders', domain: 'production', module_key: 'production-order', module_name: 'Production Order', action: 'manage', sort_order: 431 },

  // ── 7.6 Distribution ──────────────────────────────────────────────────────
  { code: 'distribution.read', name: 'View Distribution', domain: 'distribution', module_key: 'distribution', module_name: 'Distribution', action: 'read', sort_order: 500 },
  { code: 'distribution.manage', name: 'Manage Distribution', domain: 'distribution', module_key: 'distribution', module_name: 'Distribution', action: 'manage', sort_order: 501 },
  { code: 'delivery-order.read', name: 'View Delivery Orders', domain: 'distribution', module_key: 'delivery-order', module_name: 'Delivery Order', action: 'read', sort_order: 510 },
  { code: 'delivery-order.manage', name: 'Manage Delivery Orders', domain: 'distribution', module_key: 'delivery-order', module_name: 'Delivery Order', action: 'manage', sort_order: 511 },
  { code: 'inter-outlet-transfer.read', name: 'View Inter-Outlet Transfers', domain: 'distribution', module_key: 'inter-outlet-transfer', module_name: 'Inter-Outlet Transfer', action: 'read', sort_order: 520 },
  { code: 'inter-outlet-transfer.manage', name: 'Manage Inter-Outlet Transfers', domain: 'distribution', module_key: 'inter-outlet-transfer', module_name: 'Inter-Outlet Transfer', action: 'manage', sort_order: 521 },

  // ── 7.7 Sales & POS ───────────────────────────────────────────────────────
  { code: 'sales.read', name: 'View Sales', domain: 'sales', module_key: 'sales', module_name: 'Sales', action: 'read', sort_order: 600 },
  { code: 'sales.manage', name: 'Manage Sales', domain: 'sales', module_key: 'sales', module_name: 'Sales', action: 'manage', sort_order: 601 },
  { code: 'shift.read', name: 'View Shifts', domain: 'sales', module_key: 'shift', module_name: 'Shift', action: 'read', sort_order: 610 },
  { code: 'shift.manage', name: 'Manage Shifts', domain: 'sales', module_key: 'shift', module_name: 'Shift', action: 'manage', sort_order: 611 },
  { code: 'pos.read', name: 'View POS', domain: 'sales', module_key: 'pos', module_name: 'POS', action: 'read', sort_order: 620 },
  { code: 'pos.manage', name: 'Manage POS', domain: 'sales', module_key: 'pos', module_name: 'POS', action: 'manage', sort_order: 621 },

  // ── 7.8 Finance ───────────────────────────────────────────────────────────
  { code: 'finance.vendor-invoice.read', name: 'View Vendor Invoices', domain: 'finance', module_key: 'vendor-invoice', module_name: 'Vendor Invoice', action: 'read', sort_order: 700 },
  { code: 'finance.vendor-invoice.create', name: 'Create Vendor Invoices', domain: 'finance', module_key: 'vendor-invoice', module_name: 'Vendor Invoice', action: 'create', sort_order: 701 },
  { code: 'finance.vendor-invoice.update', name: 'Update Vendor Invoices', domain: 'finance', module_key: 'vendor-invoice', module_name: 'Vendor Invoice', action: 'update', sort_order: 702 },
  { code: 'finance.vendor-invoice.verify', name: 'Verify Vendor Invoices', domain: 'finance', module_key: 'vendor-invoice', module_name: 'Vendor Invoice', action: 'verify', sort_order: 703 },
  { code: 'finance.vendor-invoice.post', name: 'Post Vendor Invoices', domain: 'finance', module_key: 'vendor-invoice', module_name: 'Vendor Invoice', action: 'post', sort_order: 704 },
  { code: 'finance.vendor-invoice.manage', name: 'Manage Vendor Invoices', domain: 'finance', module_key: 'vendor-invoice', module_name: 'Vendor Invoice', action: 'manage', sort_order: 705 },
  { code: 'finance.accounts-payable.read', name: 'View Accounts Payable', domain: 'finance', module_key: 'accounts-payable', module_name: 'Accounts Payable', action: 'read', sort_order: 710 },
  { code: 'finance.accounts-payable.manage', name: 'Manage Accounts Payable', domain: 'finance', module_key: 'accounts-payable', module_name: 'Accounts Payable', action: 'manage', sort_order: 711 },
  { code: 'payment.read', name: 'View Payments', domain: 'finance', module_key: 'payment', module_name: 'Payment', action: 'read', sort_order: 720 },
  { code: 'payment.manage', name: 'Manage Payments', domain: 'finance', module_key: 'payment', module_name: 'Payment', action: 'manage', sort_order: 721 },
  { code: 'expense.read', name: 'View Expenses', domain: 'finance', module_key: 'expense', module_name: 'Expense', action: 'read', sort_order: 730 },
  { code: 'expense.manage', name: 'Manage Expenses', domain: 'finance', module_key: 'expense', module_name: 'Expense', action: 'manage', sort_order: 731 },
  { code: 'cashflow.read', name: 'View Cash Flow', domain: 'finance', module_key: 'cashflow', module_name: 'Cash Flow', action: 'read', sort_order: 740 },
  { code: 'cashflow.manage', name: 'Manage Cash Flow', domain: 'finance', module_key: 'cashflow', module_name: 'Cash Flow', action: 'manage', sort_order: 741 },

  // ── 7.9 Reporting ─────────────────────────────────────────────────────────
  { code: 'dashboard.read', name: 'View Dashboard', domain: 'reporting', module_key: 'dashboard', module_name: 'Dashboard', action: 'read', sort_order: 800 },
  { code: 'report.read', name: 'View Reports', domain: 'reporting', module_key: 'report', module_name: 'Report', action: 'read', sort_order: 810 },
  { code: 'report.manage', name: 'Manage Reports', domain: 'reporting', module_key: 'report', module_name: 'Report', action: 'manage', sort_order: 811 },

  // ── 7.10 Settings ─────────────────────────────────────────────────────────
  { code: 'setting.read', name: 'View Settings', domain: 'settings', module_key: 'setting', module_name: 'Setting', action: 'read', sort_order: 900 },
  { code: 'setting.manage', name: 'Manage Settings', domain: 'settings', module_key: 'setting', module_name: 'Setting', action: 'manage', sort_order: 901 },
  { code: 'company.read', name: 'View Company', domain: 'settings', module_key: 'company', module_name: 'Company', action: 'read', sort_order: 910 },
  { code: 'company.manage', name: 'Manage Company', domain: 'settings', module_key: 'company', module_name: 'Company', action: 'manage', sort_order: 911 },
];

/** Default role definitions — scoped per company when seeded at register-company time */
export const DEFAULT_ROLES = [
  {
    code: 'OWNER',
    name: 'Owner',
    description: 'Full access to all company resources',
    permissions: 'ALL', // special sentinel — assign all permissions
  },
  {
    code: 'SUPERVISOR_OUTLET',
    name: 'Supervisor Outlet',
    description: 'Manages outlet sales and shifts; read-only on most master data',
    permissions: [
      'outlet.read', 'product-group.read', 'category.read', 'uom.read',
      'supplier.read', 'payment-term.read', 'product.read', 'procurement.return.read',
      'sales.manage', 'shift.manage',
    ],
  },
  {
    code: 'ADMIN_GUDANG',
    name: 'Admin Gudang',
    description: 'Manages warehouse operations, goods receipt, and stock adjustments',
    permissions: [
      'outlet.read', 'product-group.read', 'category.read', 'uom.read',
      'supplier.read', 'payment-term.read', 'payment-term.manage',
      'product.read', 'inventory.manage',
      'procurement.gr.read', 'procurement.gr.create', 'procurement.gr.update',
      'procurement.gr.complete', 'procurement.gr.manage',
      'procurement.return.read', 'procurement.return.create',
      'procurement.return.update', 'procurement.return.complete',
      'procurement.return.manage',
      'inventory.adjustment.read', 'inventory.adjustment.create',
      'inventory.adjustment.update', 'inventory.adjustment.approve',
      'inventory.adjustment.complete', 'inventory.adjustment.manage',
      'inventory.stock-count.read', 'inventory.stock-count.create',
      'inventory.stock-count.update', 'inventory.stock-count.approve',
      'inventory.stock-count.complete', 'inventory.stock-count.manage',
    ],
  },
  {
    code: 'PRODUKSI',
    name: 'Production Staff',
    description: 'Manages recipes and production orders',
    permissions: [
      'product-group.read', 'category.read', 'uom.read',
      'supplier.read', 'payment-term.read', 'product.read', 'procurement.return.read',
      'recipe.manage', 'production-order.read', 'production-order.manage',
    ],
  },
  {
    code: 'KASIR',
    name: 'Kasir',
    description: 'POS cashier — manages sales and shifts',
    permissions: [
      'product.read', 'uom.read', 'payment-term.read', 'procurement.return.read',
      'sales.manage', 'shift.manage',
    ],
  },
];
