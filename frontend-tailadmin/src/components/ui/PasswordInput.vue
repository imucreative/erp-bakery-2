<template>
  <div class="relative">
    <BaseInput
      :id="id"
      :model-value="modelValue"
      :type="visible ? 'text' : 'password'"
      :name="name"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :error="error"
      :disabled="disabled"
      class="pe-11"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <BaseButton
      variant="ghost"
      icon-only
      type="button"
      class="absolute top-1/2 end-4 z-30 -translate-y-1/2"
      :aria-label="toggleLabel"
      :title="toggleLabel"
      :disabled="disabled"
      @click="visible = !visible"
    >
      <EyeOff v-if="!visible" class="h-5 w-5" aria-hidden="true" color="grey" />
      <Eye v-else class="h-5 w-5" aria-hidden="true" color="grey" />
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'

/**
 * PasswordInput — BaseInput + tombol lihat/sembunyikan password.
 *
 * Tombolnya `BaseButton` (`variant="ghost"`, `icon-only`) supaya konsisten dengan
 * tombol lain dan bisa diakses keyboard/screen reader (dulu `<span @click>`), serta
 * posisinya memakai properti logis `end-4` sehingga otomatis benar pada RTL.
 * Dipakai Signin, Signup, ResetPassword, dan modal Ganti Password.
 */
withDefaults(
  defineProps<{
    id: string
    modelValue: string
    name?: string
    placeholder?: string
    autocomplete?: string
    error?: string | null
    disabled?: boolean
  }>(),
  { error: null, disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const visible = ref(false)

const toggleLabel = computed(() => (visible.value ? 'Sembunyikan password' : 'Tampilkan password'))
</script>
