<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Production Report" />

    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Analisis produksi dengan filter date range, outlet, dan recipe
          </p>
        </div>
        <BaseButton
          variant="primary"
          :disabled="exporting"
          @click="exportReport"
        >
          {{ exporting ? 'Exporting...' : 'Export CSV' }}
        </BaseButton>
      </div>

    <!-- Filters -->
    <ComponentCard title="Filters">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <BaseFormField label="From" fieldId="dateFrom" :error="dateFromError">
          <BaseInput
            id="dateFrom"
            v-model="filters.dateFrom"
            type="date"
            :error="dateFromError || undefined"
          />
        </BaseFormField>

        <BaseFormField label="To" fieldId="dateTo" :error="dateToError">
          <BaseInput
            id="dateTo"
            v-model="filters.dateTo"
            type="date"
            :error="dateToError || undefined"
          />
        </BaseFormField>

        <BaseFormField label="Outlet" fieldId="outletId">
          <EntityCombobox
            :model-value="filters.outletId"
            :selected-label="outletSelectedLabel"
            :items="outletResults"
            :item-id="(o: Outlet) => o.id"
            :item-label="(o: Outlet) => o.name"
            :searching="outletSearching"
            searching-text="Mencari..."
            empty-text="Outlet tidak ditemukan."
            placeholder="All Outlets"
            aria-label="Pilih outlet"
            @update:model-value="filters.outletId = $event"
            @search="onOutletSearch"
            @select="onOutletSelect"
            @clear="onOutletClear"
          />
        </BaseFormField>

        <BaseFormField label="Recipe" fieldId="recipeId">
          <EntityCombobox
            :model-value="filters.recipeId"
            :selected-label="recipeSelectedLabel"
            :items="recipeResults"
            :item-id="(r: Recipe) => r.id"
            :item-label="(r: Recipe) => r.name"
            :searching="recipeSearching"
            searching-text="Mencari..."
            empty-text="Resep tidak ditemukan."
            placeholder="All Recipes"
            aria-label="Pilih resep"
            @update:model-value="filters.recipeId = $event"
            @search="onRecipeSearch"
            @select="onRecipeSelect"
            @clear="onRecipeClear"
          />
        </BaseFormField>
      </div>

      <div class="mt-4 flex justify-end">
        <BaseButton variant="primary" :disabled="loading" @click="loadReport">
          {{ loading ? 'Loading...' : 'Apply Filters' }}
        </BaseButton>
      </div>
    </ComponentCard>

    <!-- Summary Cards -->
    <div v-if="report" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard
        title="Total Orders"
        :value="report.summary.totalOrders"
        format="number"
      />
      <KpiCard
        title="Total Produced"
        :value="report.summary.totalProduced"
        format="number"
      />
      <KpiCard
        title="Total Waste"
        :value="report.summary.totalWaste"
        format="number"
        trend-color="red"
      />
      <KpiCard
        title="Average Yield"
        :value="report.summary.averageYield"
        format="percent"
      />
    </div>

    <!-- Daily Breakdown Table -->
    <ComponentCard v-if="report" title="Daily Breakdown" desc="Production per day per recipe">
      <BaseTable
        :is-empty="report.details.length === 0"
        empty-message="Tidak ada data produksi."
        aria-label="Daftar produksi harian"
      >
        <template #header>
          <BaseTableRow variant="header">
            <BaseTableHead>Date</BaseTableHead>
            <BaseTableHead>Outlet</BaseTableHead>
            <BaseTableHead>Recipe</BaseTableHead>
            <BaseTableHead align="end">Planned Qty</BaseTableHead>
            <BaseTableHead align="end">Produced Qty</BaseTableHead>
            <BaseTableHead align="end">Waste Qty</BaseTableHead>
            <BaseTableHead align="end">Yield</BaseTableHead>
          </BaseTableRow>
        </template>
        <template #body>
          <BaseTableRow v-for="row in report.details" :key="`${row.date}-${row.recipeId}`">
            <BaseTableCell>
              {{ formatDate(row.date) }}
            </BaseTableCell>
            <BaseTableCell>
              {{ row.outletName }}
            </BaseTableCell>
            <BaseTableCell>
              <span class="text-strong">{{ row.recipeName }}</span>
            </BaseTableCell>
            <BaseTableCell align="end">
              {{ row.plannedQty }}
            </BaseTableCell>
            <BaseTableCell align="end" emphasis="medium">
              {{ row.producedQty }}
            </BaseTableCell>
            <BaseTableCell align="end">
              {{ row.wasteQty }}
            </BaseTableCell>
            <BaseTableCell align="end" emphasis="medium">
              {{ row.yield.toFixed(1) }}%
            </BaseTableCell>
          </BaseTableRow>
        </template>
      </BaseTable>
    </ComponentCard>

    <!-- Empty State -->
    <div v-if="!report && !loading" class="text-center py-12 text-gray-400">
      Apply filters to load production report
    </div>

    <!-- Loading Overlay -->
    <div
      v-if="loading"
      class="fixed inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-50"
    >
      <div class="text-gray-600 dark:text-gray-400">Loading report...</div>
    </div>

    <!-- Error Alert -->
    <BaseAlert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      class="mt-4"
    />
  </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useProductionReport } from '@/composables/useReports'
import { outletService, type Outlet } from '@/services/outlet.service'
import { recipeService, type Recipe } from '@/services/recipe.service'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { BaseTable, BaseTableRow, BaseTableHead, BaseTableCell } from '@/components/ui'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseFormField from '@/components/ui/BaseFormField.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'

const SEARCH_DEBOUNCE_MS = 300

const { report, filters, loading, exporting, errorMessage, loadReport, exportReport } =
  useProductionReport()

// ── Outlet autocomplete (server-side) ────────────────────────────────
const outletResults = ref<Outlet[]>([])
const outletSearching = ref<boolean>(false)
const outletSelectedLabel = ref<string>('')
let outletSearchTimer: ReturnType<typeof setTimeout> | undefined

function onOutletSearch(query: string): void {
  if (outletSearchTimer) {
    clearTimeout(outletSearchTimer)
  }
  if (query.length === 0) {
    outletResults.value = []
    outletSearching.value = false
    return
  }
  outletSearching.value = true
  outletSearchTimer = setTimeout(async () => {
    try {
      const result = await outletService.list({ page: 1, limit: 50, search: query })
      outletResults.value = result.items
    } catch {
      outletResults.value = []
    } finally {
      outletSearching.value = false
    }
  }, SEARCH_DEBOUNCE_MS)
}

function onOutletSelect(outlet: Outlet): void {
  outletSelectedLabel.value = outlet.name
  outletResults.value = []
}

function onOutletClear(): void {
  outletSelectedLabel.value = ''
  outletResults.value = []
}

// ── Recipe autocomplete (server-side) ────────────────────────────────
const recipeResults = ref<Recipe[]>([])
const recipeSearching = ref<boolean>(false)
const recipeSelectedLabel = ref<string>('')
let recipeSearchTimer: ReturnType<typeof setTimeout> | undefined

function onRecipeSearch(query: string): void {
  if (recipeSearchTimer) {
    clearTimeout(recipeSearchTimer)
  }
  if (query.length === 0) {
    recipeResults.value = []
    recipeSearching.value = false
    return
  }
  recipeSearching.value = true
  recipeSearchTimer = setTimeout(async () => {
    try {
      const result = await recipeService.list({ page: 1, limit: 50, search: query })
      recipeResults.value = result.items
    } catch {
      recipeResults.value = []
    } finally {
      recipeSearching.value = false
    }
  }, SEARCH_DEBOUNCE_MS)
}

function onRecipeSelect(recipe: Recipe): void {
  recipeSelectedLabel.value = recipe.name
  recipeResults.value = []
}

function onRecipeClear(): void {
  recipeSelectedLabel.value = ''
  recipeResults.value = []
}

// Validation
const dateFromError = computed(() => {
  if (!filters.value.dateFrom) return 'Date required'
  return null
})

const dateToError = computed(() => {
  if (!filters.value.dateTo) return 'Date required'
  if (filters.value.dateTo < filters.value.dateFrom) return 'End date must be after start date'
  return null
})

// Formatters
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(() => {
  loadReport()
})
</script>
