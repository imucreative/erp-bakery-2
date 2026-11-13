import type { RouteRecordRaw } from 'vue-router'

export const masterDataRoutes: RouteRecordRaw[] = [
  {
    path: '/master/outlets',
    name: 'Outlets',
    component: () => import('@/views/MasterData/OutletList.vue'),
    meta: {
      title: 'Outlets',
      permission: 'outlet.read',
    },
  },
  {
    path: '/master/uoms',
    name: 'Uoms',
    component: () => import('@/views/MasterData/UomList.vue'),
    meta: {
      title: 'Units of Measure',
      permission: 'uom.read',
    },
  },
  {
    path: '/master/suppliers',
    name: 'Suppliers',
    component: () => import('@/views/MasterData/SupplierList.vue'),
    meta: {
      title: 'Suppliers',
      permission: 'supplier.read',
    },
  },
  {
    path: '/master/payment-terms',
    name: 'PaymentTerms',
    component: () => import('@/views/MasterData/PaymentTermList.vue'),
    meta: {
      title: 'Payment Terms',
      permission: 'payment-term.read',
    },
  },
  {
    path: '/master/product-groups',
    name: 'ProductGroups',
    component: () => import('@/views/MasterData/ProductGroupList.vue'),
    meta: {
      title: 'Product Groups',
      permission: 'product-group.read',
    },
  },
  {
    path: '/master/categories',
    name: 'Categories',
    component: () => import('@/views/MasterData/CategoryList.vue'),
    meta: {
      title: 'Categories',
      permission: 'category.read',
    },
  },
  {
    path: '/master/products',
    name: 'Products',
    component: () => import('@/views/MasterData/ProductList.vue'),
    meta: {
      title: 'Products',
      permission: 'product.read',
    },
  },
  {
    path: '/master/product-types',
    name: 'ProductTypes',
    component: () => import('@/views/MasterData/ProductTypeList.vue'),
    meta: {
      title: 'Product Types',
      permission: 'product.read',
    },
  },
  {
    path: '/master/toppings',
    name: 'Toppings',
    component: () => import('@/views/MasterData/ToppingList.vue'),
    meta: {
      title: 'Toppings',
      permission: 'product.read',
    },
  },
]
