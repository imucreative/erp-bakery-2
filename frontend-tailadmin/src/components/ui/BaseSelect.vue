<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

defineOptions({ inheritAttrs: false })

interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

interface BaseSelectProps {
  modelValue: string
  id: string
  options: SelectOption[]
  placeholder?: string
  error?: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<BaseSelectProps>(), {
  placeholder: '',
  error: null,
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const attrs = useAttrs()

/**
 * Reka's SelectItem forbids an empty-string value (it reserves "" for "clear
 * selection"). Callers legitimately use "" for options like "Semua Outlet", so
 * swap it for a private sentinel inside Reka and translate back on emit.
 */
const EMPTY_OPTION_VALUE = '__erp_select_empty__'

const hasEmptyOption = computed(() => props.options.some((option) => option.value === ''))
const renderedOptions = computed(() =>
  props.options.map((option) => ({
    ...option,
    internalValue: option.value === '' ? EMPTY_OPTION_VALUE : option.value,
  })),
)

/**
 * Reka treats `undefined` as "nothing selected" and shows the placeholder.
 * When the caller has no option with an empty value, an empty model value means
 * "not chosen yet", so map it to `undefined`; otherwise keep it (e.g. "Semua Outlet").
 */
const internalValue = computed<string | undefined>(() => {
  if (props.modelValue === '') {
    return hasEmptyOption.value ? EMPTY_OPTION_VALUE : undefined
  }
  return props.modelValue
})

const describedBy = computed<string | undefined>(() => {
  if (props.error) return `${props.id}-error`
  const hintId = attrs['aria-describedby']
  return typeof hintId === 'string' ? hintId : undefined
})

function onUpdate(value: unknown): void {
  if (value === EMPTY_OPTION_VALUE) {
    emit('update:modelValue', '')
    return
  }
  emit('update:modelValue', value === null || value === undefined ? '' : String(value))
}
</script>

<template>
  <SelectRoot
    :model-value="internalValue"
    :disabled="props.disabled"
    @update:model-value="onUpdate"
  >
    <SelectTrigger
      v-bind="attrs"
      :id="props.id"
      :aria-invalid="props.error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="form-input relative flex h-11 w-full items-center justify-between pe-10 text-start"
    >
      <SelectValue
        :placeholder="props.placeholder || 'Pilih...'"
        class="truncate data-[placeholder]:text-gray-400 dark:data-[placeholder]:text-white/30"
      />
      <SelectIcon
        class="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
      >
        <ChevronDown class="h-5 w-5" aria-hidden="true" />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        class="z-[100000] max-h-72 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="option in renderedOptions"
            :key="option.internalValue"
            :value="option.internalValue"
            :disabled="option.disabled"
            class="relative flex cursor-pointer select-none items-center rounded-md py-2 ps-8 pe-3 text-theme-sm text-gray-700 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-gray-100 dark:text-gray-300 dark:data-[highlighted]:bg-white/[0.06]"
          >
            <SelectItemIndicator class="absolute start-2 inline-flex items-center">
              <Check class="h-4 w-4" aria-hidden="true" />
            </SelectItemIndicator>
            <SelectItemText class="truncate">{{ option.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
