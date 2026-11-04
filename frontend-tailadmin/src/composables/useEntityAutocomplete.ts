import { ref } from 'vue'

/** Default debounce for server-side entity search inputs (report filters). */
export const ENTITY_SEARCH_DEBOUNCE_MS = 300

interface EntityAutocompleteOptions<T> {
  /** Server-side search; must resolve to the item list for the query. */
  search: (query: string) => Promise<T[]>
  /** Human label shown once an item is selected. */
  label: (item: T) => string
  debounceMs?: number
}

/**
 * Debounced, server-side entity autocomplete used by the report filter bars
 * (Outlet / Product / Recipe). Extracted so the three report pages stop
 * duplicating the same timer + state wiring.
 */
export function useEntityAutocomplete<T>({
  search,
  label,
  debounceMs = ENTITY_SEARCH_DEBOUNCE_MS,
}: EntityAutocompleteOptions<T>) {
  const results = ref<T[]>([]) as import('vue').Ref<T[]>
  const searching = ref(false)
  const selectedLabel = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined

  function clearResults(): void {
    results.value = []
    searching.value = false
  }

  function onSearch(query: string): void {
    if (timer) {
      clearTimeout(timer)
    }
    if (query.length === 0) {
      clearResults()
      return
    }

    searching.value = true
    timer = setTimeout(async () => {
      try {
        results.value = await search(query)
      } catch {
        results.value = []
      } finally {
        searching.value = false
      }
    }, debounceMs)
  }

  function onSelect(item: T): void {
    selectedLabel.value = label(item)
    results.value = []
  }

  function onClear(): void {
    selectedLabel.value = ''
    results.value = []
  }

  return { results, searching, selectedLabel, onSearch, onSelect, onClear }
}
