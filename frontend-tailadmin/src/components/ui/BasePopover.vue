<script setup lang="ts">
/**
 * BasePopover — Reka UI Popover wrapper (trigger + portalled content).
 *
 * Handles open state, outside-click/Escape dismissal, focus management, and
 * popper positioning. Callers provide a single trigger element in `#trigger`
 * and the panel content in the default slot; panel styling stays at the call
 * site via `contentClass`.
 */
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

type PopoverSide = 'top' | 'right' | 'bottom' | 'left'
type PopoverAlign = 'start' | 'center' | 'end'

const open = defineModel<boolean>('open', { default: false })

withDefaults(
  defineProps<{
    side?: PopoverSide
    align?: PopoverAlign
    sideOffset?: number
    contentClass?: string
    modal?: boolean
  }>(),
  {
    side: 'bottom',
    align: 'center',
    sideOffset: 8,
    contentClass: '',
    modal: false,
  },
)
</script>

<template>
  <PopoverRoot v-model:open="open" :modal="modal">
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        :class="contentClass"
      >
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
