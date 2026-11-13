<script setup lang="ts">
/**
 * UomConversionFormModal — set the global conversion metadata
 * (dimension + factorToCanonical) for an existing UOM. The backend derives all
 * inter-UOM factors from these two fields.
 */
import { computed, ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseSelect,
} from '@/components/ui'
import type { Uom } from '@/services/uom.service'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    uom?: Uom | null
    dimensions?: UomDimensionDefinition[]
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { uom: null, dimensions: () => [], submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', payload: { dimension: string; factorToCanonical: number }): void
}>()

const dimension = ref<string>('')
const factorToCanonical = ref<number | null>(null)
const localError = ref<string | null>(null)

const dimensionOptions = computed(() =>
  props.dimensions.map((item) => ({ value: item.code, label: item.name })),
)

const selectedDimension = computed<UomDimensionDefinition | null>(
  () => props.dimensions.find((item) => item.code === dimension.value) ?? null,
)

const canonicalHint = computed<string>(() =>
  selectedDimension.value
    ? `${selectedDimension.value.canonicalUnitName} (${selectedDimension.value.canonicalUnitSymbol})`
    : 'satuan terkecil dimensinya',
)

const factorLabel = computed<string>(() =>
  selectedDimension.value
    ? `Faktor ke satuan kanonik (${selectedDimension.value.canonicalUnitName})`
    : 'Faktor ke satuan kanonik',
)

function updateFactor(value: string | number): void {
  factorToCanonical.value = value === '' ? null : Number(value)
}

watch(
  () => [props.open, props.uom] as const,
  ([open]) => {
    if (open) {
      dimension.value = props.uom?.dimension ?? ''
      factorToCanonical.value = props.uom?.factorToCanonical ?? null
      localError.value = null
    }
  },
  { immediate: true },
)

function onSubmit(): void {
  if (!dimension.value) {
    localError.value = 'Dimensi wajib dipilih.'
    return
  }
  const factor = Number(factorToCanonical.value)
  if (!Number.isFinite(factor) || factor <= 0) {
    localError.value = 'Faktor ke satuan kanonik harus lebih besar dari 0.'
    return
  }
  if (factor < 1) {
    localError.value =
      'Faktor minimal 1 karena satuan kanonik adalah satuan terkecil. Untuk satuan lebih kecil, ubah satuan terkecil di halaman Dimensi UOM.'
    return
  }

  localError.value = null
  emit('submit', { dimension: dimension.value, factorToCanonical: factor })
}
</script>

<template>
  <BaseModal :open="open" size="xl" @close="emit('close')">
    <h4 class="modal-title mb-1">Atur Konversi UOM</h4>
    <p class="text-muted mb-4">
      {{ uom?.name ?? '—' }}
      <span v-if="uom?.code" class="text-meta">({{ uom.code }})</span>
    </p>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseAlert
        v-if="dimensions.length === 0"
        message="Belum ada dimensi UOM. Tambahkan dimensi beserta satuan terkecilnya di menu Dimensi UOM terlebih dahulu."
        size="sm"
        variant="warning"
      />

      <BaseFormField label="Dimensi" field-id="uom-conversion-dimension" required>
        <BaseSelect
          id="uom-conversion-dimension"
          v-model="dimension"
          :options="dimensionOptions"
          placeholder="Pilih dimensi"
        />
      </BaseFormField>

      <BaseFormField :label="factorLabel" field-id="uom-conversion-factor" required>
        <BaseInput
          id="uom-conversion-factor"
          :model-value="factorToCanonical ?? ''"
          type="number"
          min="1"
          step="any"
          placeholder="mis. 1000"
          @update:model-value="updateFactor"
        />
      </BaseFormField>

      <p class="text-meta">
        1 {{ uom?.name || 'UOM' }} = {{ factorToCanonical || '…' }} {{ canonicalHint }}. Faktor
        minimal 1 — satuan kanonik adalah satuan terkecil pada dimensinya.
      </p>

      <BaseAlert :message="localError || errorMessage" size="sm" />

      <div class="button-row pt-2">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
          <template #start-icon>
            <X class="h-4 w-4" aria-hidden="true" />
          </template>
          Batal
        </BaseButton>
        <BaseButton
          type="submit"
          variant="success"
          :loading="submitting"
          loading-text="Menyimpan..."
        >
          <template #start-icon>
            <Save class="h-4 w-4" aria-hidden="true" />
          </template>
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
