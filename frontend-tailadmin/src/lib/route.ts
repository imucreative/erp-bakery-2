/**
 * Helper pencocokan route untuk penanda menu aktif.
 *
 * `isRouteActive` menganggap sebuah path aktif bila sama persis dengan route
 * saat ini atau merupakan leluhurnya. Jadi halaman anak seperti
 * `/procurement/purchase-requests/new` tetap menyalakan menu
 * `/procurement/purchase-requests`.
 */
export function isRouteActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === currentPath) {
    return true
  }

  const prefix = itemPath.endsWith('/') ? itemPath : `${itemPath}/`
  return currentPath.startsWith(prefix)
}
