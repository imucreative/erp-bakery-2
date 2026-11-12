import type { RouteRecordRaw } from 'vue-router'

export const productionRoutes: RouteRecordRaw[] = [
  {
    path: '/production/recipes',
    name: 'ProductionRecipes',
    component: () => import('@/views/Production/RecipeList.vue'),
    meta: {
      title: 'Recipe',
      permission: 'recipe.read',
    },
  },
  {
    path: '/production/recipes/create',
    name: 'ProductionRecipeCreate',
    component: () => import('@/views/Production/RecipeForm.vue'),
    meta: {
      title: 'Buat Resep',
      permission: 'recipe.manage',
    },
  },
  {
    path: '/production/recipes/:id/edit',
    name: 'ProductionRecipeEdit',
    component: () => import('@/views/Production/RecipeForm.vue'),
    meta: {
      title: 'Edit Resep',
      permission: 'recipe.manage',
    },
  },
  {
    path: '/production/recipes/:id',
    name: 'ProductionRecipeDetail',
    component: () => import('@/views/Production/RecipeDetail.vue'),
    meta: {
      title: 'Detail Resep',
      permission: 'recipe.read',
    },
  },
  {
    path: '/production/orders',
    name: 'ProductionOrders',
    component: () => import('@/views/Production/ProductionOrderList.vue'),
    meta: {
      title: 'Production Orders',
      permission: 'production-order.read',
    },
  },
  {
    path: '/production/orders/create',
    name: 'ProductionOrderCreate',
    component: () => import('@/views/Production/ProductionOrderForm.vue'),
    meta: {
      title: 'Produksi',
      permission: 'production-order.manage',
    },
  },
  {
    path: '/production/orders/:id',
    name: 'ProductionOrderDetail',
    component: () => import('@/views/Production/ProductionOrderDetail.vue'),
    meta: {
      title: 'Detail Production Order',
      permission: 'production-order.read',
    },
  },
]
