/**
 * Deterministic badge colour for a UOM dimension code.
 *
 * Dimensions are data — admins can add any code from Kelola Dimensi — so the
 * colour cannot be a hardcoded per-dimension map. FNV-1a over the code keeps the
 * same dimension on the same colour across rows, pages, and screens, and spreads
 * the seeded dimensions across the eight-hue palette without collisions.
 */
export type DimensionBadgeColor =
  'primary' | 'success' | 'warning' | 'info' | 'error' | 'orange' | 'purple' | 'pink'

const DIMENSION_COLORS: DimensionBadgeColor[] = [
  'info',
  'primary',
  'success',
  'warning',
  'purple',
  'orange',
  'error',
  'pink',
]

export function dimensionBadgeColor(code: string | null): DimensionBadgeColor {
  if (!code) {
    return 'error'
  }

  let hash = 2166136261
  for (let index = 0; index < code.length; index += 1) {
    hash ^= code.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return DIMENSION_COLORS[(hash >>> 0) % DIMENSION_COLORS.length]
}
