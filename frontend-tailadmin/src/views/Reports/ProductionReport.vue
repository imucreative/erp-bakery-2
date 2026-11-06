<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Production Report" />

    <div class="space-y-6">
      <ReportPageHeader
        description="Analisis produksi dengan filter date range, outlet, dan recipe"
        :exporting="exporting"
        @export="exportReport"
      />

      <ProductionReportFilters :filters="filters" :loading="loading" @apply="loadReport" />

      <ProductionReportKpiGrid v-if="report" :summary="report.summary" />

      <ProductionReportTable v-if="report" :rows="report.details" />

      <div v-if="!report && !loading" class="panel-muted">
        Apply filters to load production report
      </div>

      <div v-if="loading" class="page-loading-overlay">
        <div class="text-muted">Loading report...</div>
      </div>

      <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mt-4" />
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useProductionReport } from '@/composables/useReports'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import ReportPageHeader from '@/components/reports/ReportPageHeader.vue'
import ProductionReportFilters from '@/components/reports/ProductionReportFilters.vue'
import ProductionReportKpiGrid from '@/components/reports/ProductionReportKpiGrid.vue'
import ProductionReportTable from '@/components/reports/ProductionReportTable.vue'

const { report, filters, loading, exporting, errorMessage, loadReport, exportReport } =
  useProductionReport()

onMounted(() => {
  loadReport()
})
</script>
