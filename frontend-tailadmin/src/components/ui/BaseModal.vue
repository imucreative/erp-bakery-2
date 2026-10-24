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
  props.placement === 'end'
    ? 'fixed inset-0 z-99999 flex justify-end'
    : 'fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4',
)

const panelClass = computed(() => {
  if (props.placement === 'end') {
    return `relative flex h-full w-full ${sizeClass[props.size]} flex-col overflow-y-auto border-s border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900`
  }
  return `relative w-full ${sizeClass[props.size]} rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900${
    props.scrollable ? ' max-h-[90vh] overflow-y-auto' : ''
  }`
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
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="props.dismissible && emit('close')"
    ></div>

    <div v-bind="attrs" :class="panelClass" role="dialog" aria-modal="true">
      <slot />
    </div>
  </div>
</template>
