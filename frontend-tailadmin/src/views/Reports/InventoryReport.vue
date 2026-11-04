<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Inventory Report" />

    <div class="space-y-6">
      <ReportPageHeader
        description="Stock on hand per product dengan batch details"
        :exporting="exporting"
        @export="exportReport"
      />

      <InventoryReportFilters :filters="filters" :loading="loading" @apply="loadReport" />

      <InventoryReportKpiGrid v-if="report" :summary="report.summary" />

      <InventoryReportTable v-if="report" :rows="report.details" />

      <div v-if="!report && !loading" class="panel-muted">
        Apply filters to load inventory report
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
import { useInventoryReport } from '@/composables/useReports'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import ReportPageHeader from '@/components/reports/ReportPageHeader.vue'
import InventoryReportFilters from '@/components/reports/InventoryReportFilters.vue'
import InventoryReportKpiGrid from '@/components/reports/InventoryReportKpiGrid.vue'
import InventoryReportTable from '@/components/reports/InventoryReportTable.vue'

const { report, filters, loading, exporting, errorMessage, loadReport, exportReport } =
  useInventoryReport()

onMounted(() => {
  loadReport()
})
</script>
