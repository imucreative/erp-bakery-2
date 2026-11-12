import { createRouter, createWebHistory, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasPermission } from '@/composables/usePermission'
import { isTwoFactorEnabled } from '@/lib/twoFactorGate'
import { routes } from './routes'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
    permission?: string
    /** Platform-console route — super admin only, never tenant-scoped. */
    platform?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes,
})

export default router

/**
 * Safety valve: a guard that redirects in a cycle freezes the whole tab, so
 * consecutive redirects are capped (>5 within one second → let it through;
 * the backend still enforces access).
 */
let redirectBurst = { count: 0, since: 0 }

router.beforeEach(async (to, from, next) => {
  document.title = `${to.meta.title ?? 'Bakery ERP'} | Bakery ERP`

  const guardRedirect = (target: RouteLocationRaw) => {
    const now = Date.now()
    if (now - redirectBurst.since > 1000) {
      redirectBurst = { count: 0, since: now }
    }
    redirectBurst.count += 1
    if (redirectBurst.count > 5) {
      return next()
    }
    return next(target)
  }

  const auth = useAuthStore()

  // "Keep me logged in": silently exchange a stored refresh token before the
  // guard decides whether this session is authenticated.
  if (!auth.isAuthenticated) {
    await auth.restoreSession()
  }

  const isPublic = to.meta.public === true
  const isPlatform = to.meta.platform === true
  // Profile hosts the 2FA enrollment card, so a super admin must be able to
  // open it while the platform console still refuses them.
  const isProfile = to.name === 'Profile'

  // Where this session belongs: super admin lives in the platform console,
  // everyone else in the tenant ERP.
  const home = auth.isSuperAdmin ? { name: 'PlatformCompanies' } : { name: 'DashboardOwner' }

  // Authenticated users should not see the auth pages.
  if (isPublic && auth.isAuthenticated && (to.name === 'Signin' || to.name === 'Signup')) {
    return guardRedirect(home)
  }

  // Protected routes require authentication.
  if (!isPublic && !auth.isAuthenticated) {
    return guardRedirect({ name: 'Signin', query: { redirect: to.fullPath } })
  }

  // Platform console routes: super admin only.
  if (isPlatform && !auth.isSuperAdmin) {
    return guardRedirect({ name: 'DashboardOwner' })
  }

  // A super admin has no company context — keep it out of tenant screens.
  // Profile is exempt: it is where 2FA enrollment happens.
  if (!isPublic && auth.isSuperAdmin && !isPlatform && !isProfile) {
    return guardRedirect({ name: 'PlatformCompanies' })
  }

  // Platform console requires 2FA on the operator account.
  if (isPlatform && auth.isSuperAdmin) {
    const twoFactorReady = await isTwoFactorEnabled()
    if (!twoFactorReady) {
      return guardRedirect({ name: 'Profile', query: { twoFactor: 'required' } })
    }
  }

  // Permission-gated routes: redirect to the session home when the user lacks it.
  const required = to.meta.permission
  if (required && !hasPermission(auth.permissions, auth.isSuperAdmin, required)) {
    return guardRedirect(home)
  }

  return next()
})
