import { computed, ref, watch } from 'vue'
import type { EntityComboboxProps } from './types'
import {
  DEFAULT_CLEAR_ARIA_LABEL,
  DEFAULT_EMPTY_TEXT,
  DEFAULT_MAX_SUGGESTIONS,
  DEFAULT_PLACEHOLDER,
  DEFAULT_SEARCHING_TEXT,
  DEFAULT_VISIBLE_ITEM_COUNT,
  ENTITY_COMBOBOX_MIN_QUERY_LENGTH,
  entityComboboxListMaxHeight,
  foldEntityLabel,
} from './types'

/** Decoupled emit callbacks so the composable stays testable and type-safe. */
export interface EntityComboboxEmitHandlers<T> {
  updateModelValue: (id: string) => void
  search: (query: string) => void
  select: (item: T) => void
  clear: () => void
}

/**
 * All state/interaction logic for EntityCombobox: query/open state, client vs
 * server filtering, selection, clear, and the adapters for arbitrary entities.
 */
export function useEntityCombobox<T>(
  props: EntityComboboxProps<T>,
  handlers: EntityComboboxEmitHandlers<T>,
) {
  const query = ref<string>('')
  const open = ref<boolean>(false)
  const highlightedId = ref<string | undefined>(undefined)

  // ── Adapters (keep the component entity-shape agnostic) ─────────────
  const labelOf = (item: T): string => (props.itemLabel ? props.itemLabel(item) : String(item))
  const disabledOf = (item: T): boolean => (props.itemDisabled ? props.itemDisabled(item) : false)
  const hintOf = (item: T): string => {
    const hint = props.itemDisabledHint
    if (!hint) {
      return ''
    }
    return typeof hint === 'string' ? hint : hint(item)
  }

  const mode = computed(() => props.mode ?? 'server')
  const searchingText = computed(() => props.searchingText ?? DEFAULT_SEARCHING_TEXT)
  const emptyText = computed(() => props.emptyText ?? DEFAULT_EMPTY_TEXT)
  const placeholder = computed(() => props.placeholder ?? DEFAULT_PLACEHOLDER)
  const clearAriaLabel = computed(() => props.clearAriaLabel ?? DEFAULT_CLEAR_ARIA_LABEL)
  const maxSuggestions = computed(() => props.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS)
  const useTeleport = computed(() => props.teleport ?? true)

  /** Clamped so a nonsensical value can never produce an invalid `calc()`. */
  const visibleItemCount = computed(() => {
    const raw = Number(props.visibleItemCount ?? DEFAULT_VISIBLE_ITEM_COUNT)
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_VISIBLE_ITEM_COUNT
  })
  const listMaxHeight = computed(() => entityComboboxListMaxHeight(visibleItemCount.value))

  const trimmedQuery = computed(() => query.value.trim())

  /**
   * Reka opens on the first keystroke. We additionally require a non-empty query
   * (same rule as before) and keep the whole open state controlled so clearing
   * the input closes the popup immediately.
   */
  const effectiveOpen = computed<boolean>({
    get: () => open.value && trimmedQuery.value.length >= ENTITY_COMBOBOX_MIN_QUERY_LENGTH,
    set: (value: boolean) => {
      open.value = value
    },
  })

  const visibleItems = computed<T[]>(() => {
    if (trimmedQuery.value.length < ENTITY_COMBOBOX_MIN_QUERY_LENGTH) {
      return []
    }
    if (mode.value === 'server') {
      return props.items
    }
    const needle = foldEntityLabel(trimmedQuery.value)
    const matches = props.items.filter((item) => foldEntityLabel(labelOf(item)).includes(needle))
    return matches.slice(0, maxSuggestions.value)
  })

  // ── Handlers ────────────────────────────────────────────────────────
  function onQueryUpdate(value: string): void {
    query.value = value
    if (mode.value === 'server') {
      handlers.search(value.trim())
    }
  }

  function onInputFocus(): void {
    if (trimmedQuery.value.length >= ENTITY_COMBOBOX_MIN_QUERY_LENGTH) {
      open.value = true
    }
  }

  function onHighlight(payload?: { value: unknown }): void {
    highlightedId.value = payload ? String(payload.value) : undefined
  }

  function onSelectValue(value: unknown): void {
    const id = value === null || value === undefined ? '' : String(value)
    if (!id) {
      handlers.updateModelValue('')
      return
    }
    const item = props.items.find((candidate) => props.itemId(candidate) === id)
    if (item && !disabledOf(item)) {
      handlers.select(item)
    }
    handlers.updateModelValue(id)
    query.value = ''
    open.value = false
  }

  function clearSelection(): void {
    handlers.clear()
    handlers.updateModelValue('')
    query.value = ''
    open.value = false
  }

  // A selection made by the caller (v-model, form reset, …) resets the query so
  // the next time the field is opened it does not show a stale filter.
  watch(
    () => props.modelValue,
    () => {
      query.value = ''
      open.value = false
    },
  )

  return {
    query,
    effectiveOpen,
    highlightedId,
    visibleItems,
    labelOf,
    disabledOf,
    hintOf,
    searchingText,
    emptyText,
    placeholder,
    clearAriaLabel,
    listMaxHeight,
    useTeleport,
    onQueryUpdate,
    onInputFocus,
    onHighlight,
    onSelectValue,
    clearSelection,
  }
}
