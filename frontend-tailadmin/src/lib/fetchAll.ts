/**
 * fetch-all-paginated helper for list endpoints.
 *
 * The backend caps `limit` at 100 (`@Max(100)` on list query DTOs) and silently
 * clamps endpoints that lack the decorator. Any UI that needs the FULL dataset
 * (dropdowns, pickers, id→name resolution maps) must therefore page through the
 * results with `limit = 100` instead of asking for an oversized page — a single
 * `limit: 200` request is rejected ("limit must not be greater than 100") or
 * truncated.
 *
 * `fetchAllPaginated` takes a page loader `(page) => Promise<{ items, meta }>`
 * and accumulates every item across pages. It stops when the accumulated count
 * reaches `meta.total`, or when a page returns zero items (defensive guard
 * against a bad/empty `total`). The caller supplies a loader bound with its own
 * filters; the loader must request `limit = PAGE_LIMIT` so paging stays aligned
 * with the backend cap.
 */

/** Backend list `limit` cap (`@Max(100)`). Use as the per-page size. */
export const PAGE_LIMIT = 100

interface PageMeta {
  total: number
}

interface Page<T> {
  items: T[]
  meta: PageMeta
}

/**
 * Load every item of a paginated list by requesting successive pages.
 *
 * @param loadPage loader for a single page (1-based); must request `PAGE_LIMIT`.
 * @returns all items concatenated in page order.
 */
export async function fetchAllPaginated<T>(
  loadPage: (page: number) => Promise<Page<T>>,
): Promise<T[]> {
  const all: T[] = []
  let page = 1
  // Hard upper bound so a misbehaving backend can never loop forever.
  const maxPages = 1000
  while (page <= maxPages) {
    const result = await loadPage(page)
    all.push(...result.items)
    if (result.items.length === 0 || all.length >= result.meta.total) {
      break
    }
    page += 1
  }
  return all
}
