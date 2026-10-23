<script setup lang="ts">
/**
 * BaseAlert — banner notifikasi inline. `variant` menentukan warna, `size`
 * menentukan kepadatan (sm untuk di dalam modal, md untuk di halaman).
 * Mengirim `message` membuat komponen menyembunyikan diri saat kosong, jadi
 * pemakai tidak perlu menulis `v-if` sendiri. Ikon dibiarkan sebagai slot
 * karena tiap fitur memilih ikonnya sendiri.
 */
import { computed, useAttrs, useSlots } from 'vue'
import { X } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

const props = withDefaults(
  defineProps<{
    variant?: AlertVariant
    size?: 'sm' | 'md'
    dismissible?: boolean
    message?: string | null
  }>(),
  { variant: 'error', size: 'md', dismissible: false, message: null },
)

const emit = defineEmits<{
  (event: 'dismiss'): void
}>()

const attrs = useAttrs()
const slots = useSlots()

const variantClass: Record<AlertVariant, string> = {
  error: 'alert-error',
  success: 'alert-success',
  warning: 'alert-warning',
  info: 'alert-info',
}

const dismissClass: Record<AlertVariant, string> = {
  error: 'text-error-600 hover:bg-error-100 dark:text-error-400 dark:hover:bg-error-500/20',
  success:
    'text-success-600 hover:bg-success-100 dark:text-success-500 dark:hover:bg-success-500/20',
  warning:
    'text-warning-600 hover:bg-warning-100 dark:text-warning-400 dark:hover:bg-warning-500/20',
  info: 'text-brand-600 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/20',
}

const hasIcon = computed(() => Boolean(slots.icon))
const hasContent = computed(() => Boolean(slots.default))
const visible = computed(() => Boolean(props.message) || hasContent.value)
const structured = computed(() => props.dismissible || hasIcon.value)

const rootClass = computed(
  () =>
    `${variantClass[props.variant]} ${props.size === 'sm' ? 'px-3 py-2' : 'px-4 py-3'}${
      structured.value ? ' flex items-start justify-between gap-3' : ''
    }`,
)

const role = computed(() =>
  props.variant === 'error' || props.variant === 'warning' ? 'alert' : 'status',
)
</script>

<template>
  <div v-if="visible" v-bind="attrs" :class="rootClass" :role="role">
    <span v-if="structured" class="flex items-center gap-2">
      <slot name="icon" />
      <span>
        <slot>{{ props.message }}</slot>
      </span>
    </span>
    <slot v-else>{{ props.message }}</slot>

    <button
      v-if="props.dismissible"
      type="button"
      aria-label="Tutup notifikasi"
      title="Tutup notifikasi"
      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition"
      :class="dismissClass[props.variant]"
      @click="emit('dismiss')"
    >
      <X class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>
