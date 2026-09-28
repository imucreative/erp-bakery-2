<script setup lang="ts">
/**
 * Primitive button (ui layer) built on Reka UI's polymorphic Primitive. The
 * ERP UI Foundation ERPButton wraps this; feature components use ERPButton.
 */
import { computed } from 'vue';
import { Primitive } from 'reka-ui';

const props = withDefaults(
  defineProps<{
    as?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  { as: 'button', type: 'button', disabled: false },
);

const nativeAttrs = computed<Record<string, unknown>>(() => ({
  type: props.as === 'button' ? props.type : undefined,
  disabled: props.disabled || undefined,
}));
</script>

<template>
  <Primitive :as="as" v-bind="nativeAttrs">
    <slot />
  </Primitive>
</template>
