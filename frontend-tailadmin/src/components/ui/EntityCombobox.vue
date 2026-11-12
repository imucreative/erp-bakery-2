<script setup lang="ts" generic="T">
/**
 * EntityCombobox — reusable text autocomplete for picking ONE entity from a long
 * list, rendered as a "chosen chip" plus a search input.
 *
 * Built on Reka UI Combobox (ARIA, keyboard, focus handling, outside-dismiss,
 * popper positioning) with the internals split into `entity-combobox/`:
 *   - `useEntityCombobox.ts` — query/open state, client/server filtering, handlers
 *   - `EntityComboboxSearch.vue` — search icon + ComboboxInput
 *   - `EntityComboboxChip.vue` — chosen chip + clear button
 *   - `EntityComboboxList.vue` — portal/content/viewport/items + item slot
 *   - `types.ts` — public props/emits, slot contract, constants, helpers
 *
 * Data loading stays with the caller:
 *   - mode 'server' (default): emits `search` on every keystroke, renders `items`
 *     verbatim.
 *   - mode 'client': filters `items` locally (accent-insensitive, capped by
 *     `maxSuggestions`).
 *
 * Callers use `itemId` / `itemLabel` / `itemDisabled` / `itemDisabledHint`
 * adapters; `select` fires alongside `update:modelValue` for side effects (e.g.
 * auto-defaulting a UOM).
 */
import { ComboboxAnchor, ComboboxRoot } from 'reka-ui'
import EntityComboboxChip from './entity-combobox/EntityComboboxChip.vue'
import EntityComboboxList from './entity-combobox/EntityComboboxList.vue'
import EntityComboboxSearch from './entity-combobox/EntityComboboxSearch.vue'
import { useEntityCombobox } from './entity-combobox/useEntityCombobox'
import type {
  EntityComboboxEmits,
  EntityComboboxItemSlot,
  EntityComboboxProps,
} from './entity-combobox/types'

const props = withDefaults(defineProps<EntityComboboxProps<T>>(), {
  teleport: true,
})

const emit = defineEmits<EntityComboboxEmits<T>>()

defineSlots<{
  item(props: EntityComboboxItemSlot<T>): unknown
}>()

const {
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
} = useEntityCombobox<T>(props, {
  updateModelValue: (id) => emit('update:modelValue', id),
  search: (searchQuery) => emit('search', searchQuery),
  select: (item) => emit('select', item),
  clear: () => emit('clear'),
})
</script>

<template>
  <ComboboxRoot
    v-model:open="effectiveOpen"
    :model-value="props.modelValue || undefined"
    :disabled="props.disabled"
    :ignore-filter="true"
    :reset-search-term-on-blur="false"
    :reset-search-term-on-select="false"
    :open-on-focus="false"
    :open-on-click="false"
    :highlight-on-hover="true"
    :loop="true"
    @update:model-value="onSelectValue"
    @highlight="onHighlight"
  >
    <ComboboxAnchor class="relative">
      <EntityComboboxChip
        v-if="props.modelValue"
        :label="props.selectedLabel"
        :clear-aria-label="clearAriaLabel"
        :disabled="props.disabled"
        @clear="clearSelection"
      />
      <EntityComboboxSearch
        v-else
        :model-value="query"
        :placeholder="placeholder"
        :aria-label="props.ariaLabel"
        :disabled="props.disabled"
        @update:model-value="onQueryUpdate"
        @focus="onInputFocus"
      />
    </ComboboxAnchor>

    <EntityComboboxList
      :items="visibleItems"
      :item-id="props.itemId"
      :label-of="labelOf"
      :disabled-of="disabledOf"
      :hint-of="hintOf"
      :highlighted-id="highlightedId"
      :searching="props.searching === true"
      :searching-text="searchingText"
      :empty-text="emptyText"
      :max-height="listMaxHeight"
      :teleport="useTeleport"
    >
      <template v-if="$slots.item" #item="slotProps">
        <slot name="item" v-bind="slotProps" />
      </template>
    </EntityComboboxList>
  </ComboboxRoot>
</template>
