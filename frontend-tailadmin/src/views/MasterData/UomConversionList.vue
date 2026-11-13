<script setup lang="ts">
/**
 * UomConversionList — global UOM conversion master (doc 52 B2).
 *
 * Every UOM carries a physical dimension + factor to that dimension's
 * canonical (smallest) unit. Dimensions come from the global catalog managed at
 * /master/uom-dimensions; the backend derives all inter-unit conversion factors
 * from these values. This page is the focused setup surface for that metadata.
 */
import { computed, ref } from 'vue'
import { Pencil, RefreshCw } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import {
  BaseAlert,
  BaseButton,
  BaseInput,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
} from '@/components/ui'
import UomConversionFormModal from '@/components/masterdata/uom-conversion/UomConversionFormModal.vue'
import { usePermission } from '@/composables/usePermission'
import { uomService, type Uom } from '@/services/uom.service'
import { uomDimensionService, type UomDimensionDefinition } from '@/services/uom-dimension.service'
import { toMessage } from '@/lib/errors'

const pageTitle = 'Konversi UOM'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('uom.manage'))

const items = ref<Uom[]>([])
const dimensions = ref<UomDimensionDefinition[]>([])
const loading = ref<boolean>(false)
const errorMessage = ref<string | null>(null)
const search = ref<string>('')

const dimensionMap = computed<Map<string, UomDimensionDefinition>>(
  () => new Map(dimensions.value.map((item) => [item.code, item])),
)

function dimensionLabel(code: string | null): string {
  if (!code) {
    return 'Belum diset'
  }
  return dimensionMap.value.get(code)?.name ?? code
}

function canonicalLabel(code: string): string {
  const definition = dimensionMap.value.get(code)
  return definition ? `${definition.canonicalUnitName} (${definition.canonicalUnitSymbol})` : code
}

const factorFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 })

function formatFactor(value: number | null): string {
  return value === null ? '—' : factorFormatter.format(value)
}

function equivalent(uom: Uom): string {
  if (!uom.dimension || uom.factorToCanonical === null) {
    return 'Belum diset'
  }
  return `1 ${uom.name} = ${formatFactor(uom.factorToCanonical)} ${canonicalLabel(uom.dimension)}`
}

const missingMetadataCount = computed<number>(
  () => items.value.filter((uom) => !uom.dimension || uom.factorToCanonical === null).length,
)

const filteredItems = computed<Uom[]>(() => {
  const query = search.value.trim().toLowerCase()
  const rows = query
    ? items.value.filter(
        (uom) =>
          uom.name.toLowerCase().includes(query) ||
          uom.code.toLowerCase().includes(query) ||
          dimensionLabel(uom.dimension).toLowerCase().includes(query),
      )
    : items.value
  return [...rows].sort((a, b) => {
    const da = a.dimension ?? 'ZZZ'
    const db = b.dimension ?? 'ZZZ'
    return da === db ? a.name.localeCompare(b.name) : da.localeCompare(db)
  })
})

async function fetchList(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  try {
    const [result, dimensionList] = await Promise.all([
      uomService.list({ page: 1, limit: 100 }),
      uomDimensionService.list(),
    ])
    items.value = result.items
    dimensions.value = dimensionList
  } catch (error) {
    errorMessage.value = toMessage(error)
    items.value = []
  } finally {
    loading.value = false
  }
}

// ── Edit metadata modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const editing = ref<Uom | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openEdit(uom: Uom): void {
  editing.value = uom
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: {
  dimension: string
  factorToCanonical: number
}): Promise<void> {
  if (!editing.value) {
    return
  }
  submitting.value = true
  formError.value = null
  try {
    await uomService.update(editing.value.id, {
      dimension: payload.dimension,
      factorToCanonical: payload.factorToCanonical,
    })
    formOpen.value = false
    await fetchList()
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

void fetchList()
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Konversi UOM Global"
      desc="Atur dimensi dan faktor ke satuan kanonik. Konversi antar-satuan dihitung otomatis (1 kg = 1000 g, 1 liter = 1000 ml, 1 lusin = 12 pcs)."
    >
      <div class="toolbar-row">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput
            id="uom-conversion-search"
            v-model="search"
            placeholder="Cari nama, kode, atau dimensi..."
          />
        </div>
        <BaseButton size="sm" variant="outline" :disabled="loading" @click="fetchList">
          <template #start-icon>
            <RefreshCw class="h-4 w-4" aria-hidden="true" />
          </template>
          Muat Ulang
        </BaseButton>
      </div>

      <BaseAlert v-if="dimensions.length === 0" variant="warning" size="sm" class="mb-3">
        Belum ada dimensi UOM. Tentukan dimensi dan satuan terkecilnya di
        <RouterLink class="font-medium underline" to="/master/uom-dimensions">
          Dimensi UOM
        </RouterLink>
        terlebih dahulu.
      </BaseAlert>

      <BaseAlert
        v-if="missingMetadataCount > 0"
        :message="`${missingMetadataCount} UOM belum punya dimensi/faktor. Konversi multi-satuan untuk UOM tersebut belum bisa dipakai.`"
        size="sm"
        class="mb-3"
      />

      <div v-if="dimensions.length > 0" class="panel-card mb-3">
        <p class="text-strong">Satuan kanonik per dimensi</p>
        <p class="text-meta mt-1">
          Satuan kanonik adalah satuan terkecil pada dimensinya dan menjadi acuan semua faktor.
          Faktor minimal 1; konversi antar-UOM dalam dimensi yang sama dihitung otomatis. Ubah
          satuan terkecil hanya lewat
          <RouterLink class="font-medium underline" to="/master/uom-dimensions">
            Dimensi UOM
          </RouterLink>
          .
        </p>
        <dl class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div v-for="dimension in dimensions" :key="dimension.code">
            <dt class="text-muted-xs uppercase">{{ dimension.name }}</dt>
            <dd class="text-value">
              {{ dimension.canonicalUnitName }} ({{ dimension.canonicalUnitSymbol }})
            </dd>
          </div>
        </dl>
      </div>

      <BaseTable
        :loading="loading"
        :error-message="errorMessage"
        :is-empty="filteredItems.length === 0"
        empty-message="Belum ada UOM. Tambahkan UOM terlebih dahulu di menu Units of Measure."
        aria-label="Daftar konversi UOM"
      >
        <template #header>
          <BaseTableRow variant="header">
            <BaseTableHead>Nama</BaseTableHead>
            <BaseTableHead>Kode</BaseTableHead>
            <BaseTableHead>Dimensi</BaseTableHead>
            <BaseTableHead align="end">Faktor</BaseTableHead>
            <BaseTableHead>Ekuivalen</BaseTableHead>
            <BaseTableHead>Status</BaseTableHead>
            <BaseTableHead align="end">Aksi</BaseTableHead>
          </BaseTableRow>
        </template>
        <template #body>
          <BaseTableRow v-for="uom in filteredItems" :key="uom.id">
            <BaseTableCell emphasis="medium">{{ uom.name }}</BaseTableCell>
            <BaseTableCell emphasis="mono">{{ uom.code }}</BaseTableCell>
            <BaseTableCell>
              <Badge v-if="uom.dimension" color="info">
                {{ dimensionLabel(uom.dimension) }}
              </Badge>
              <Badge v-else color="warning">Belum diset</Badge>
            </BaseTableCell>
            <BaseTableCell align="end">{{ formatFactor(uom.factorToCanonical) }}</BaseTableCell>
            <BaseTableCell>
              <span :class="uom.dimension && uom.factorToCanonical !== null ? '' : 'text-muted'">
                {{ equivalent(uom) }}
              </span>
            </BaseTableCell>
            <BaseTableCell>
              <Badge :color="uom.isActive ? 'success' : 'error'">
                {{ uom.isActive ? 'Aktif' : 'Nonaktif' }}
              </Badge>
            </BaseTableCell>
            <BaseTableCell align="end">
              <BaseButton
                v-if="canManage"
                size="sm"
                variant="outline"
                icon-only
                aria-label="Atur konversi"
                title="Atur konversi"
                @click="openEdit(uom)"
              >
                <Pencil class="h-4 w-4" aria-hidden="true" />
              </BaseButton>
              <span v-else class="text-muted-xs">—</span>
            </BaseTableCell>
          </BaseTableRow>
        </template>
      </BaseTable>
    </ComponentCard>

    <UomConversionFormModal
      :open="formOpen"
      :uom="editing"
      :dimensions="dimensions"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />
  </AdminLayout>
</template>
