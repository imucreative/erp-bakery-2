<script setup lang="ts" generic="T">
/**
 * EntityCombobox — reusable text autocomplete for picking ONE entity from a long
 * list, rendered as a "chosen chip" plus a search input.
 *
 * WHY IT EXISTS
 * The Bakery ERP forms repeatedly need "pick one product/outlet/supplier from
 * hundreds of rows". A native <select> does not scale (it renders every option)
 * and cannot express "this candidate is already taken". This component centralises
 * that interaction: chip + clear button, search input, dropdown, arrow-key / Enter
 * / Escape navigation, blur-dismiss, and the ARIA combobox wiring.
 *
 * It is presentation + interaction ONLY. Data loading stays with the caller:
 *   - mode 'server' (default): the component emits `search` on every keystroke
 *     and renders `items` verbatim. The caller debounces and calls its service.
 *   - mode 'client': the component filters `items` itself (case- and
 *     accent-insensitive match on the label, capped at `maxSuggestions`).
 *
 * Callers stay in control of everything else through:
 *   - `itemId` (required) / `itemLabel` / `itemDisabled` / `itemDisabledHint`
 *     adapters, so the component works for any entity shape.
 *   - the `select` event, which fires alongside `update:modelValue` — that is
 *     where callers apply side effects such as auto-defaulting a UOM.
 *
 * DROPDOWN PORTALLING
 * The dropdown is teleported to <body> and positioned from the measured input rect
 * (default `teleport: true`). This is required whenever the field lives inside an
 * `overflow-auto` container — e.g. a line-items grid — because CSS forces the
 * other axis to `auto` too and would clip a nested dropdown. It repositions on
 * any scroll (including ancestor scroll containers, hence the capture phase) and
 * closes itself if the anchor scrolls out of view.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'

const DEFAULT_SEARCHING_TEXT = 'Mencari...'
const DEFAULT_EMPTY_TEXT = 'Tidak ditemukan.'
const DEFAULT_PLACEHOLDER = 'Ketik untuk mencari...'
const DEFAULT_VISIBLE_ITEM_COUNT = 10
const DEFAULT_MAX_SUGGESTIONS = 50
const DEFAULT_CLEAR_ARIA_LABEL = 'Hapus pilihan'

/** Height of one suggestion row: text-theme-sm line-height 20px + py-2 (16px). */
const ITEM_HEIGHT_REM = 2.25
/** Padding of the list container (py-1 on both edges). */
const LIST_PADDING_REM = 0.5
/** Border of the list container (1px per side). */
const LIST_BORDER_PX = 2

/** Below this the list is not rendered at all (avoids an empty popup on focus). */
const MIN_QUERY_LENGTH = 1

const props = withDefaults(
  defineProps<{
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
  }>(),
  {
    /**
     * MUST be defaulted explicitly. Vue casts an ABSENT boolean prop to `false`
     * when the runtime type is `Boolean` and there is no default, so a bare
     * `props.teleport ?? true` would silently evaluate to `false` and render the
     * dropdown inline — which clips it inside any `overflow` container (e.g. a
     * line-items grid) and makes its options unclickable.
     */
    teleport: true,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
  (e: 'search', query: string): void
  (e: 'select', item: T): void
  (e: 'clear'): void
}>()

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'

// ── Adapters (keep the component entity-shape agnostic) ───────────────
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

/** Clamped so a nonsensical value can never produce an invalid `calc()`. */
const visibleItemCount = computed(() => {
  const raw = Number(props.visibleItemCount ?? DEFAULT_VISIBLE_ITEM_COUNT)
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_VISIBLE_ITEM_COUNT
})
const useTeleport = computed(() => props.teleport ?? true)

/**
 * Dropdown height = exactly `visibleItemCount` rows plus the container's own
 * padding and border, so the box never clips its last visible row while the list
 * itself becomes the scroll container for anything beyond it.
 *
 * NOTE: these constants are a hand-maintained mirror of the CSS. If the row
 * padding (`py-2`), the container padding (`py-1`), the border, or
 * `--text-theme-sm--line-height` change in `main.css`, they must be updated here.
 */
const listMaxHeight = computed<string>(
  () =>
    `calc(${visibleItemCount.value} * ${ITEM_HEIGHT_REM}rem + ${LIST_PADDING_REM}rem + ${LIST_BORDER_PX}px)`,
)

// ── Interaction state ────────────────────────────────────────────────
const query = ref<string>('')
const open = ref<boolean>(false)
const highlighted = ref<number>(-1)
const anchorEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const box = ref<{ top: number; left: number; width: number } | null>(null)
let blurTimer: ReturnType<typeof setTimeout> | undefined

/** Strip accents + lowercase so "roti" also matches "Rôti". */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const trimmedQuery = computed<string>(() => query.value.trim())

const visibleItems = computed<T[]>(() => {
  if (trimmedQuery.value.length < MIN_QUERY_LENGTH) {
    return []
  }
  if (mode.value === 'server') {
    return props.items
  }
  const needle = fold(trimmedQuery.value)
  const matches = props.items.filter((item) => fold(labelOf(item)).includes(needle))
  return matches.slice(0, maxSuggestions.value)
})

// ── Anchoring ────────────────────────────────────────────────────────
function reposition(): void {
  const el = anchorEl.value
  if (!el) {
    return
  }
  const rect = el.getBoundingClientRect()
  // Anchor scrolled out of the viewport: a floating list would point at nothing.
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    close()
    return
  }
  box.value = { top: rect.bottom + 4, left: rect.left, width: rect.width }
}

function openDropdown(el: HTMLElement): void {
  open.value = true
  highlighted.value = -1
  anchorEl.value = el
  reposition()
}

/**
 * Keep the keyboard-highlighted row inside the list's own scroll box. Without
 * this, arrowing past the last visible row highlights something the user cannot
 * see, because the list (not the page) is the scroll container.
 *
 * `listEl` MUST be the scroll container (the element carrying `overflow-y-auto` +
 * the computed `max-height`), NOT the inner `<ul role="listbox">`. The `<ul>`
 * grows to its content height, so writing `scrollTop` on it is a no-op
 * (`scrollHeight === clientHeight`) and this function would silently do nothing.
 *
 * Only `scrollTop` is written, and the delta comes from `getBoundingClientRect()`:
 *   - `scrollIntoView` would also scroll every scrollable ancestor up to the
 *     document, yanking the page while the user only navigates suggestions.
 *   - `offsetTop` cannot be used: it is relative to the offsetParent's PADDING
 *     box, while `scrollTop` lives in the content scroll coordinate space, so the
 *     container's `py-1` would inject a constant offset error.
 *
 * `getBoundingClientRect()` measures the border box, so a residual error of one
 * border pixel per edge remains — invisible, and it cannot overshoot because the
 * value is written once from a single measurement without re-measuring.
 */
function scrollHighlightedIntoView(): void {
  if (highlighted.value < 0) {
    return
  }
  void nextTick(() => {
    const list = listEl.value
    const row = list?.querySelector<HTMLElement>(`[data-option-index="${highlighted.value}"]`)
    if (!list || !row) {
      return
    }
    const listRect = list.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    if (rowRect.top < listRect.top) {
      list.scrollTop -= listRect.top - rowRect.top
    } else if (rowRect.bottom > listRect.bottom) {
      list.scrollTop += rowRect.bottom - listRect.bottom
    }
  })
}

function close(): void {
  open.value = false
  highlighted.value = -1
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = undefined
  }
}

function onViewportChange(): void {
  if (open.value) {
    reposition()
  }
}

// ── Handlers ─────────────────────────────────────────────────────────
function onInput(event: Event): void {
  const el = event.target as HTMLInputElement
  query.value = el.value
  highlighted.value = -1
  if (!open.value) {
    openDropdown(el)
  }
  // Client mode filters locally, so the caller is not asked to fetch.
  if (mode.value === 'server') {
    emit('search', el.value.trim())
  }
}

function onFocus(event: FocusEvent): void {
  if (trimmedQuery.value.length < MIN_QUERY_LENGTH) {
    return
  }
  openDropdown(event.target as HTMLElement)
}

function onBlur(): void {
  // Delay so a mousedown on an option registers before the list closes.
  blurTimer = setTimeout(close, 150)
}

function choose(item: T): void {
  if (disabledOf(item)) {
    return
  }
  emit('select', item)
  emit('update:modelValue', props.itemId(item))
  query.value = ''
  close()
}

function clearSelection(): void {
  emit('clear')
  emit('update:modelValue', '')
  query.value = ''
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (open.value) {
      event.preventDefault()
      close()
    }
    return
  }
  const items = visibleItems.value
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      // Reopen on the first arrow press without forcing a fresh query event.
      const el = event.target as HTMLElement
      if (trimmedQuery.value.length >= MIN_QUERY_LENGTH) {
        openDropdown(el)
      }
      highlighted.value = 0
      scrollHighlightedIntoView()
      return
    }
    if (items.length === 0) {
      return
    }
    highlighted.value =
      event.key === 'ArrowDown'
        ? (highlighted.value + 1) % items.length
        : highlighted.value <= 0
          ? items.length - 1
          : highlighted.value - 1
    scrollHighlightedIntoView()
    return
  }
  if (event.key === 'Enter') {
    if (!open.value || highlighted.value < 0) {
      return
    }
    const picked = items[highlighted.value]
    if (picked) {
      event.preventDefault()
      choose(picked)
    }
  }
}

// A selection made by the caller (v-model, form reset, …) resets the query so the
// next time the field is opened it does not show a stale filter.
watch(
  () => props.modelValue,
  (next) => {
    if (next !== '') {
      query.value = ''
      close()
    }
  },
)

onMounted(() => {
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  if (blurTimer) {
    clearTimeout(blurTimer)
  }
})
</script>

<template>
  <div class="relative">
    <!-- Chosen chip -->
    <div
      v-if="props.modelValue"
      class="flex h-11 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90"
    >
      <span class="truncate">{{ props.selectedLabel }}</span>
      <button
        type="button"
        :aria-label="clearAriaLabel"
        :title="clearAriaLabel"
        :disabled="props.disabled"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
        @click="clearSelection"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <!-- Search input (shown while nothing is chosen) -->
    <div v-else class="relative">
      <span
        class="pointer-events-none absolute inset-y-0 start-3 my-auto flex h-5 w-5 items-center text-gray-400 dark:text-gray-500"
      >
        <Search class="h-4 w-4" aria-hidden="true" />
      </span>
      <input
        :value="query"
        type="text"
        :placeholder="placeholder"
        :disabled="props.disabled"
        :aria-label="props.ariaLabel"
        :class="[inputClass, 'ps-10']"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
    </div>

    <!-- Suggestions. `:disabled` keeps them in place for the inline variant, so a
         single markup block serves both teleport and non-teleport usage. -->
    <Teleport to="body" :disabled="!useTeleport">
      <div
        v-if="open"
        ref="listEl"
        :class="[
          'z-50 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900',
          useTeleport ? 'fixed' : 'absolute mt-1 w-full',
        ]"
        :style="[
          { maxHeight: listMaxHeight },
          useTeleport && box
            ? { top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px` }
            : {},
        ]"
      >
        <p v-if="props.searching" class="px-4 py-2 text-theme-sm text-gray-500 dark:text-gray-400">
          {{ searchingText }}
        </p>
        <p
          v-else-if="visibleItems.length === 0"
          class="px-4 py-2 text-theme-sm text-gray-500 dark:text-gray-400"
        >
          {{ emptyText }}
        </p>
        <ul v-else role="listbox">
          <li
            v-for="(item, index) in visibleItems"
            :key="props.itemId(item)"
            :data-option-index="index"
            :class="[
              'px-4 py-2 text-theme-sm',
              disabledOf(item)
                ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                : [
                    'cursor-pointer text-gray-700 dark:text-gray-300',
                    index === highlighted
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                  ],
            ]"
            role="option"
            :aria-selected="index === highlighted"
            :aria-disabled="disabledOf(item)"
            @mousedown.prevent="choose(item)"
            @mousemove="highlighted = disabledOf(item) ? -1 : index"
          >
            <slot
              name="item"
              :item="item"
              :index="index"
              :highlighted="index === highlighted"
              :disabled="disabledOf(item)"
              :label="labelOf(item)"
            >
              <span :class="disabledOf(item) ? 'line-through' : ''">{{ labelOf(item) }}</span>
              <span
                v-if="disabledOf(item) && hintOf(item)"
                class="ms-2 text-theme-xs text-warning-600 dark:text-orange-400"
              >
                — {{ hintOf(item) }}
              </span>
            </slot>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
