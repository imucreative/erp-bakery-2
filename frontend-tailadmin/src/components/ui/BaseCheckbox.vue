<script setup lang="ts">
import { useAttrs } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { Check } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

interface BaseCheckboxProps {
  modelValue: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<BaseCheckboxProps>(), {
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const attrs = useAttrs()

function onUpdate(value: boolean | 'indeterminate'): void {
  emit('update:modelValue', value === true)
}
</script>

<template>
  <CheckboxRoot
    v-bind="attrs"
    :model-value="props.modelValue"
    :disabled="props.disabled"
    class="checkbox"
    @update:model-value="onUpdate"
  >
    <CheckboxIndicator class="flex items-center justify-center">
      <Check class="h-3 w-3" stroke-width="3" aria-hidden="true" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
