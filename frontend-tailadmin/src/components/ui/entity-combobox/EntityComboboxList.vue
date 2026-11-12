<script setup lang="ts" generic="T">
import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxPortal,
  ComboboxViewport,
} from 'reka-ui'
import type { EntityComboboxItemSlot } from './types'

interface EntityComboboxListProps<T> {
  items: T[]
  itemId: (item: T) => string
  labelOf: (item: T) => string
  disabledOf: (item: T) => boolean
  hintOf: (item: T) => string
  highlightedId?: string
  searching: boolean
  searchingText: string
  emptyText: string
  maxHeight: string
  teleport: boolean
}

const props = withDefaults(defineProps<EntityComboboxListProps<T>>(), {
  highlightedId: undefined,
})

defineSlots<{
  item(props: EntityComboboxItemSlot<T>): unknown
}>()
</script>

<template>
  <ComboboxPortal :disabled="!props.teleport">
    <ComboboxContent
      position="popper"
      align="start"
      :side-offset="4"
      :body-lock="false"
      class="z-[100000] w-[var(--reka-combobox-trigger-width)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <ComboboxViewport
        class="overflow-y-auto overscroll-contain p-1"
        :style="{ maxHeight: props.maxHeight }"
      >
        <p v-if="props.searching" class="text-muted px-4 py-2">
          {{ props.searchingText }}
        </p>
        <template v-else>
          <ComboboxEmpty class="text-muted px-4 py-2">{{ props.emptyText }}</ComboboxEmpty>
          <ComboboxItem
            v-for="(item, index) in props.items"
            :key="props.itemId(item)"
            :value="props.itemId(item)"
            :text-value="props.labelOf(item)"
            :disabled="props.disabledOf(item)"
            class="flex cursor-pointer select-none items-center px-4 py-2 text-theme-sm text-gray-700 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-gray-400 dark:text-gray-300 dark:data-[disabled]:text-gray-600 data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-600 dark:data-[highlighted]:bg-brand-500/10 dark:data-[highlighted]:text-brand-400"
          >
            <slot
              name="item"
              :item="item"
              :index="index"
              :highlighted="props.highlightedId === props.itemId(item)"
              :disabled="props.disabledOf(item)"
              :label="props.labelOf(item)"
            >
              <span :class="props.disabledOf(item) ? 'line-through' : ''">
                {{ props.labelOf(item) }}
              </span>
              <span
                v-if="props.disabledOf(item) && props.hintOf(item)"
                class="ms-2 text-theme-xs text-warning-600 dark:text-orange-400"
              >
                — {{ props.hintOf(item) }}
              </span>
            </slot>
          </ComboboxItem>
        </template>
      </ComboboxViewport>
    </ComboboxContent>
  </ComboboxPortal>
</template>
