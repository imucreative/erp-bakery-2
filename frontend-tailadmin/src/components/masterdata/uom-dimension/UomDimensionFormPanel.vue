<script setup lang="ts">
/**
 * UomDimensionFormPanel — create/edit form inside the Kelola Dimensi drawer.
 * Owns its field state + client validation (same contract as the master-data
 * form modals) and emits a trimmed payload; the drawer performs the mutation.
 * Code and canonical unit are locked on edit because every factor references
 * them.
 */
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Save } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseFormField, BaseInput, BaseToggle } from '@/components/ui'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,19}$/

const props = withDefaults(
  defineProps<{
    mode: 'create' | 'edit'
    dimension?: UomDimensionDefinition | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { dimension: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (
    event: 'submit',
    payload: {
      code: string
      name: string
      canonicalUnitName: string
      canonicalUnitSymbol: string
      isActive: boolean
    },
  ): void
  (event: 'cancel'): void
}>()

const code = ref<string>('')
const name = ref<string>('')
const canonicalUnitName = ref<string>('')
const canonicalUnitSymbol = ref<string>('')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

const isEdit = computed<boolean>(() => props.mode === 'edit')

watch(
  () => [props.mode, props.dimension] as const,
  () => {
    code.value = props.dimension?.code ?? ''
    name.value = props.dimension?.name ?? ''
    canonicalUnitName.value = props.dimension?.canonicalUnitName ?? ''
    canonicalUnitSymbol.value = props.dimension?.canonicalUnitSymbol ?? ''
    isActive.value = props.dimension?.isActive ?? true
    localError.value = null
  },
  { immediate: true },
)

function onSubmit(): void {
  const normalizedCode = code.value.trim().toUpperCase()
  const trimmedName = name.value.trim()
  const trimmedUnitName = canonicalUnitName.value.trim()
  const trimmedUnitSymbol = canonicalUnitSymbol.value.trim()

  if (!isEdit.value) {
    if (normalizedCode.length === 0) {
      localError.value = 'Kode wajib diisi.'
      return
    }
    if (!CODE_PATTERN.test(normalizedCode)) {
      localError.value =
        'Kode harus diawali huruf dan hanya berisi huruf kapital, angka, atau underscore (maks. 20).'
      return
    }
  }
  if (trimmedName.length === 0) {
    localError.value = 'Nama dimensi wajib diisi.'
    return
  }
  if (!isEdit.value && (trimmedUnitName.length === 0 || trimmedUnitSymbol.length === 0)) {
    localError.value = 'Nama dan simbol satuan kanonik wajib diisi.'
    return
  }

  localError.value = null
  emit('submit', {
    code: normalizedCode,
    name: trimmedName,
    canonicalUnitName: trimmedUnitName,
    canonicalUnitSymbol: trimmedUnitSymbol,
    isActive: isActive.value,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <div class="field-grid">
      <BaseFormField
        label="Kode"
        field-id="uom-dimension-code"
        required
        :error="localError && !isEdit && !code.trim() ? localError : null"
      >
        <BaseInput
          v-if="!isEdit"
          id="uom-dimension-code"
          v-model="code"
          placeholder="mis. LENGTH"
          maxlength="20"
        />
        <p v-else class="form-readonly">{{ code }}</p>
      </BaseFormField>

      <BaseFormField
        label="Nama dimensi"
        field-id="uom-dimension-name"
        required
        :error="localError && !name.trim() ? localError : null"
      >
        <BaseInput id="uom-dimension-name" v-model="name" placeholder="mis. Panjang" />
      </BaseFormField>
    </div>

    <div class="field-grid">
      <BaseFormField
        label="Nama satuan kanonik"
        field-id="uom-dimension-canonical-name"
        :required="!isEdit"
      >
        <BaseInput
          v-if="!isEdit"
          id="uom-dimension-canonical-name"
          v-model="canonicalUnitName"
          placeholder="mis. milimeter"
        />
        <p v-else class="form-readonly">{{ canonicalUnitName }}</p>
      </BaseFormField>

      <BaseFormField label="Simbol" field-id="uom-dimension-canonical-symbol" :required="!isEdit">
        <BaseInput
          v-if="!isEdit"
          id="uom-dimension-canonical-symbol"
          v-model="canonicalUnitSymbol"
          placeholder="mis. mm"
          maxlength="20"
        />
        <p v-else class="form-readonly">{{ canonicalUnitSymbol }}</p>
      </BaseFormField>
    </div>

    <BaseToggle v-model="isActive" label="Aktif" />

    <BaseAlert
      v-if="!isEdit"
      message="Menyimpan dimensi sekaligus membuat UOM kanonik (faktor 1) untuk perusahaan Anda. Satuan kanonik adalah satuan terkecil — semua faktor UOM lain di dimensi ini minimal 1."
      size="sm"
      variant="info"
    />
    <BaseAlert
      v-else
      message="Kode dan satuan kanonik tidak dapat diubah karena menjadi acuan semua faktor konversi. Nonaktifkan dimensi jika sudah tidak dipakai."
      size="sm"
      variant="info"
    />

    <BaseAlert :message="localError || errorMessage" size="sm" />

    <div class="button-row pt-2">
      <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('cancel')">
        <template #start-icon>
          <ArrowLeft class="h-4 w-4" aria-hidden="true" />
        </template>
        Kembali
      </BaseButton>
      <BaseButton type="submit" variant="success" :loading="submitting" loading-text="Menyimpan...">
        <template #start-icon>
          <Save class="h-4 w-4" aria-hidden="true" />
        </template>
        Simpan
      </BaseButton>
    </div>
  </form>
</template>
