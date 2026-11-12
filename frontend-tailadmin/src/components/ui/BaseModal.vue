<script setup lang="ts">
/**
 * BaseModal — Reka UI Dialog: backdrop transparan dengan blur sesuai standar UI,
 * panel rounded-3xl, focus trap, scroll lock, dan tutup lewat klik backdrop / Esc.
 * Isi panel sepenuhnya milik pemakai lewat slot default; atribut tambahan
 * (misalnya class) diteruskan ke panel, bukan ke wrapper.
 *
 * `placement="end"` menggantinya menjadi drawer yang menempel di sisi akhir
 * layar (panel penuh tinggi, `border-s`); `scrollable` hanya berlaku pada
 * placement tengah karena panel drawer selalu bisa di-scroll.
 */
import { computed, useAttrs } from 'vue'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot } from 'reka-ui'

defineOptions({ inheritAttrs: false })

type ModalSize = 'md' | 'lg' | 'xl' | '2xl'
type ModalPlacement = 'center' | 'end'

const props = withDefaults(
  defineProps<{
    open: boolean
    size?: ModalSize
    placement?: ModalPlacement
    scrollable?: boolean
    dismissible?: boolean
  }>(),
  { size: 'md', placement: 'center', scrollable: false, dismissible: true },
)

const emit = defineEmits<{
  (event: 'close'): void
}>()

const attrs = useAttrs()

const sizeClass: Record<ModalSize, string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

const wrapperClass = computed(() =>
  props.placement === 'end' ? 'modal-wrapper-end' : 'modal-wrapper-center',
)

const panelClass = computed(() => {
  const baseClass = props.placement === 'end' ? 'modal-panel-end' : 'modal-panel-center'
  const scrollableClass =
    props.placement === 'center' && props.scrollable ? ' max-h-[90vh] overflow-y-auto' : ''
  return `${baseClass} ${sizeClass[props.size]}${scrollableClass}`
})

function onOpenChange(open: boolean): void {
  if (!open && props.dismissible) emit('close')
}

function onEscapeKeyDown(event: KeyboardEvent): void {
  if (!props.dismissible) event.preventDefault()
}

function onInteractOutside(event: Event): void {
  if (!props.dismissible) event.preventDefault()
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="modal-backdrop" />
      <div v-if="props.open" :class="wrapperClass">
        <DialogContent
          v-bind="attrs"
          :class="panelClass"
          @escape-key-down="onEscapeKeyDown"
          @interact-outside="onInteractOutside"
        >
          <slot />
        </DialogContent>
      </div>
    </DialogPortal>
  </DialogRoot>
</template>
