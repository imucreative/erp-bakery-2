<script setup lang="ts">
/**
 * ERPButton — foundation button. Variants + loading state. Wraps
 * PrimitiveButton (ui layer). Feature components must use this, never a raw
 * <button>.
 */
import { computed } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import PrimitiveButton from '@/components/ui/PrimitiveButton.vue';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    iconOnly?: boolean;
    ariaLabel?: string;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
    iconOnly: false,
    ariaLabel: undefined,
  },
);

const emit = defineEmits<{ (event: 'click', payload: MouseEvent): void }>();

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-background focus-visible:ring-primary/30',
  ghost:
    'bg-transparent text-foreground hover:bg-background focus-visible:ring-primary/30',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-danger/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

const iconOnlySizeClasses: Record<Size, string> = {
  sm: 'h-9 w-9 p-0',
  md: 'h-10 w-10 p-0',
};

const isDisabled = computed<boolean>(() => props.disabled || props.loading);

const classes = computed<string>(() =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-button font-medium shadow-sm outline-none transition focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
    variantClasses[props.variant],
    props.iconOnly ? iconOnlySizeClasses[props.size] : sizeClasses[props.size],
    props.block && 'w-full',
  ),
);

function onClick(event: MouseEvent): void {
  if (isDisabled.value) {
    return;
  }
  emit('click', event);
}
</script>

<template>
  <PrimitiveButton
    :type="type"
    :disabled="isDisabled"
    :class="classes"
    :aria-label="ariaLabel"
    @click="onClick"
  >
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <slot />
  </PrimitiveButton>
</template>
