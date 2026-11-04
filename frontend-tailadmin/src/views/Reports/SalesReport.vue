<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Sales Report" />

    <div class="space-y-6">
      <ReportPageHeader
        description="Analisis penjualan dengan filter date range dan outlet"
        :exporting="exporting"
        @export="exportReport"
      />

      <SalesReportFilters :filters="filters" :loading="loading" @apply="loadReport" />

      <SalesReportKpiGrid v-if="report" :summary="report.summary" />

      <SalesReportDailyTable v-if="report" :rows="report.details" />

      <SalesReportTopProductsTable
        v-if="report"
        :rows="report.topProducts"
        :applied-limit="appliedTopProductsLimit"
      />

      <div v-if="!report && !loading" class="panel-muted">
        Apply filters to load sales report
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
import { useSalesReport } from '@/composables/useReports'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import ReportPageHeader from '@/components/reports/ReportPageHeader.vue'
import SalesReportFilters from '@/components/reports/SalesReportFilters.vue'
import SalesReportKpiGrid from '@/components/reports/SalesReportKpiGrid.vue'
import SalesReportDailyTable from '@/components/reports/SalesReportDailyTable.vue'
import SalesReportTopProductsTable from '@/components/reports/SalesReportTopProductsTable.vue'

const {
  report,
  filters,
  appliedTopProductsLimit,
  loading,
  exporting,
  errorMessage,
  loadReport,
  exportReport,
} = useSalesReport()

onMounted(() => {
  loadReport()
})
</script>
