/**
 * Shared formatting helpers for the ERP UI.
 *
 *  - `formatRupiah`  → Indonesian Rupiah currency (e.g. `Rp 450.000`).
 *  - `formatDate`    → date-only display in Asia/Jakarta (e.g. `20 Jul 2026`).
 *  - `formatDateTime`→ date + time display in Asia/Jakarta.
 *  - `toISODate`     → `YYYY-MM-DD` for date <input> binding / API payloads.
 *  - `tomorrowISO`   → `YYYY-MM-DD` for tomorrow (PR expectedDate min/default).
 *
 * Storage/transport stays ISO; only the display is localized to Jakarta time.
 */

const JAKARTA_TZ = 'Asia/Jakarta'

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format a numeric amount as Indonesian Rupiah, e.g. `Rp 450.000`. */
export function formatRupiah(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return rupiahFormatter.format(amount)
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: JAKARTA_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: JAKARTA_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Display a date-only value (ISO string or Date) as `20 Jul 2026`. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '-'
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return dateFormatter.format(date)
}

/** Display a timestamp as `20 Jul 2026 14.30` (Asia/Jakarta). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '-'
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return dateTimeFormatter.format(date)
}

/** Convert a Date to a `YYYY-MM-DD` string (local calendar day). */
export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a byte count as a human-readable size (e.g. `512 B`, `4,3 KB`,
 * `2,1 MB`). Uses 1024-based units and the Indonesian decimal comma.
 */
export function formatFileSize(bytes: number | null | undefined): string {
  const value = typeof bytes === 'number' && Number.isFinite(bytes) && bytes >= 0 ? bytes : 0
  if (value < 1024) {
    return `${value} B`
  }
  const units = ['KB', 'MB', 'GB']
  let size = value / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const rounded = Math.round(size * 10) / 10
  return `${rounded.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${units[unitIndex]}`
}

/** `YYYY-MM-DD` for tomorrow — used as the PR expectedDate min & default. */
export function tomorrowISO(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toISODate(tomorrow)
}

const numberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
})

/**
 * Format a plain numeric quantity with Indonesian thousands separators
 * (e.g. `1.250`, `12,5`). Used for stock quantities and other non-currency
 * counts. Nullish/invalid input renders as `0`.
 */
export function formatNumber(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return numberFormatter.format(amount)
}

/**
 * Format a quantity together with its unit of measure, e.g. `1.800 gram`.
 * The number is rendered via `formatNumber`; the unit is appended only when a
 * non-empty label is provided (so a missing/unresolved UOM degrades to the bare
 * number). Prefer passing a short code ("KG") and falling back to the full name
 * at the call site. Display-only — never used in calculations.
 */
export function formatQtyWithUom(
  value: number | null | undefined,
  uomLabel: string | null | undefined,
): string {
  const qty = formatNumber(value)
  const label = typeof uomLabel === 'string' ? uomLabel.trim() : ''
  return label ? `${qty} ${label}` : qty
}
