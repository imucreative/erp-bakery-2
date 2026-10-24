<script setup lang="ts">
/**
 * BaseModal — kerangka modal standar: backdrop transparan dengan blur sesuai
 * standar UI, panel rounded-3xl, dan tutup lewat klik backdrop atau tombol Esc.
 * Isi panel sepenuhnya milik pemakai lewat slot default; atribut tambahan
 * (misalnya class) diteruskan ke panel, bukan ke wrapper.
 *
 * `placement="end"` menggantinya menjadi drawer yang menempel di sisi akhir
 * layar (panel penuh tinggi, `border-s`); `scrollable` hanya berlaku pada
 * placement tengah karena panel drawer selalu bisa di-scroll.
 */
import { computed, onBeforeUnmount, useAttrs, watch } from 'vue'

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

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open && props.dismissible,
  (listening) => {
    if (listening) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="props.open" :class="wrapperClass">
    <div
      class="modal-backdrop"
      aria-hidden="true"
      @click="props.dismissible && emit('close')"
    ></div>

    <div v-bind="attrs" :class="panelClass" role="dialog" aria-modal="true">
      <slot />
    </div>
  </div>
</template>
