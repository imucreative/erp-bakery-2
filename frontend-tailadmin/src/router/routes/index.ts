import type { RouteRecordRaw } from 'vue-router'
import { dashboardRoutes } from './dashboard'
import { reportsRoutes } from './reports'
import { masterDataRoutes } from './master-data'
import { procurementRoutes } from './procurement'
import { inventoryRoutes } from './inventory'
import { productionRoutes } from './production'
import { salesRoutes } from './sales'
import { systemRoutes } from './system'
import { generalRoutes } from './general'
import { platformRoutes } from './platform'
import { authRoutes } from './auth'

export const routes: RouteRecordRaw[] = [
  ...dashboardRoutes,
  ...reportsRoutes,
  ...masterDataRoutes,
  ...procurementRoutes,
  ...inventoryRoutes,
  ...productionRoutes,
  ...salesRoutes,
  ...systemRoutes,
  ...generalRoutes,
  ...platformRoutes,
  ...authRoutes,
]
