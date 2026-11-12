/** Public props/emits + shared helpers for EntityCombobox. */

export interface EntityComboboxProps<T> {
  /** Id of the selected entity; empty string means "nothing chosen". */
  modelValue: string
  /** Display text for the chosen chip. Empty → the search input is shown. */
  selectedLabel: string
  /** Candidates: server-mode results, or the full list in client mode. */
  items: T[]
  itemId: (item: T) => string
  itemLabel?: (item: T) => string
  /** Renders the candidate as unselectable (e.g. already used elsewhere). */
  itemDisabled?: (item: T) => boolean
  /** Reason suffix shown next to a disabled candidate. Constant, or per-item. */
  itemDisabledHint?: string | ((item: T) => string)
  mode?: 'server' | 'client'
  searching?: boolean
  searchingText?: string
  emptyText?: string
  placeholder?: string
  ariaLabel?: string
  /** aria-label of the chip's clear button — override to disambiguate repeats. */
  clearAriaLabel?: string
  /** Client-mode cap on rendered suggestions. */
  maxSuggestions?: number
  /**
   * Rows shown before the list itself scrolls. Caps the dropdown height so it
   * never grows taller than this many entries — the list becomes its own scroll
   * container instead of pushing the page/grid around.
   */
  visibleItemCount?: number
  disabled?: boolean
  teleport?: boolean
}

export type EntityComboboxEmits<T> = {
  (e: 'update:modelValue', id: string): void
  (e: 'search', query: string): void
  (e: 'select', item: T): void
  (e: 'clear'): void
}

/** Props exposed to the optional `item` slot. */
export interface EntityComboboxItemSlot<T> {
  item: T
  index: number
  highlighted: boolean
  disabled: boolean
  label: string
}

export const DEFAULT_SEARCHING_TEXT = 'Mencari...'
export const DEFAULT_EMPTY_TEXT = 'Tidak ditemukan.'
export const DEFAULT_PLACEHOLDER = 'Ketik untuk mencari...'
export const DEFAULT_VISIBLE_ITEM_COUNT = 10
export const DEFAULT_MAX_SUGGESTIONS = 50
export const DEFAULT_CLEAR_ARIA_LABEL = 'Hapus pilihan'

/** Height of one suggestion row: text-theme-sm line-height 20px + py-2 (16px). */
export const ENTITY_COMBOBOX_ITEM_HEIGHT_REM = 2.25
/** Padding of the list container (py-1 on both edges). */
export const ENTITY_COMBOBOX_LIST_PADDING_REM = 0.5
/** Border of the list container (1px per side). */
export const ENTITY_COMBOBOX_LIST_BORDER_PX = 2

/** Below this the list is not rendered at all (avoids an empty popup on focus). */
export const ENTITY_COMBOBOX_MIN_QUERY_LENGTH = 1

/** Strip accents + lowercase so "roti" also matches "Rôti". */
export function foldEntityLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Dropdown height = exactly `visibleItemCount` rows plus the container's own
 * padding and border, so the box never clips its last visible row while the list
 * itself becomes the scroll container for anything beyond it.
 */
export function entityComboboxListMaxHeight(visibleItemCount: number): string {
  return `calc(${visibleItemCount} * ${ENTITY_COMBOBOX_ITEM_HEIGHT_REM}rem + ${ENTITY_COMBOBOX_LIST_PADDING_REM}rem + ${ENTITY_COMBOBOX_LIST_BORDER_PX}px)`
}
