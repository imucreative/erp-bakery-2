<script setup lang="ts">
/**
 * UomFormModal — create/edit modal for a UOM. Self-contained form state; emits
 * `submit` with the payload and lets the parent run the mutation (controls
 * `submitting` + `errorMessage`). Backdrop, Esc-close, and panel chrome come
 * from BaseModal.
 *
 * Global conversion metadata (doc 52): dimension (from the global dimension
 * catalog) + factor to that dimension's canonical unit are required so GR
 * multi-unit conversion can derive factors. Factor is always >= 1 because the
 * canonical unit is the smallest unit of its dimension.
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
  BaseToggle,
} from '@/components/ui'
import type { Uom } from '@/services/uom.service'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    uom?: Uom | null
    dimensions?: UomDimensionDefinition[]
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { uom: null, dimensions: () => [], submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (
    event: 'submit',
    payload: {
      name: string
      dimension: string
      factorToCanonical: number
      isActive: boolean
    },
  ): void
}>()

const name = ref<string>('')
const dimension = ref<string>('')
const factorToCanonical = ref<number | null>(null)
const isActive = ref<boolean>(true)
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
      name.value = props.uom?.name ?? ''
      dimension.value = props.uom?.dimension ?? ''
      factorToCanonical.value = props.uom?.factorToCanonical ?? null
      isActive.value = props.uom?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

function onSubmit(): void {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
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
  emit('submit', {
    name: trimmed,
    dimension: dimension.value,
    factorToCanonical: factor,
    isActive: isActive.value,
  })
}
</script>

<template>
  <BaseModal :open="open" size="xl" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ mode === 'edit' ? 'Edit UOM' : 'Tambah UOM' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseAlert
        v-if="dimensions.length === 0"
        message="Belum ada dimensi UOM. Tambahkan dimensi beserta satuan terkecilnya di menu Dimensi UOM terlebih dahulu."
        size="sm"
        variant="warning"
      />

      <BaseFormField
        label="Nama"
        field-id="uom-name"
        required
        :error="localError && !name.trim() ? localError : null"
      >
        <BaseInput id="uom-name" v-model="name" placeholder="mis. PCS, KG, LITER" />
      </BaseFormField>

      <div class="field-grid">
        <BaseFormField label="Dimensi" field-id="uom-dimension" required>
          <BaseSelect
            id="uom-dimension"
            v-model="dimension"
            :options="dimensionOptions"
            placeholder="Pilih dimensi"
          />
        </BaseFormField>

        <BaseFormField :label="factorLabel" field-id="uom-factor" required>
          <BaseInput
            id="uom-factor"
            :model-value="factorToCanonical ?? ''"
            type="number"
            min="1"
            step="any"
            placeholder="mis. 1000"
            @update:model-value="updateFactor"
          />
        </BaseFormField>
      </div>

      <p class="text-meta">
        1 {{ name.trim() || 'UOM' }} = {{ factorToCanonical || '…' }} {{ canonicalHint }}. Faktor
        minimal 1 — satuan kanonik adalah satuan terkecil pada dimensinya.
      </p>

      <BaseToggle v-if="mode === 'edit'" v-model="isActive" label="Aktif" />

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
