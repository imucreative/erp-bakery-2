<script setup lang="ts">
/**
 * BaseModal — kerangka modal standar: backdrop transparan dengan blur sesuai
 * standar UI, panel rounded-3xl, dan tutup lewat klik backdrop atau tombol Esc.
 * Isi panel sepenuhnya milik pemakai lewat slot default; atribut tambahan
 * (misalnya class) diteruskan ke panel, bukan ke wrapper.
 */
import { computed, onBeforeUnmount, useAttrs, watch } from 'vue'

defineOptions({ inheritAttrs: false })

type ModalSize = 'md' | 'lg' | 'xl' | '2xl'

const props = withDefaults(
  defineProps<{
    open: boolean
    size?: ModalSize
    scrollable?: boolean
    dismissible?: boolean
  }>(),
  { size: 'md', scrollable: false, dismissible: true },
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

const panelClass = computed(
  () =>
    `relative w-full ${sizeClass[props.size]} rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900${
      props.scrollable ? ' max-h-[90vh] overflow-y-auto' : ''
    }`,
)

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
  <div
    v-if="props.open"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
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
