<script setup lang="ts">
/**
 * OutletDashboard — per-outlet overview (scoped to a single outlet).
 *
 * NOTE: the backend metrics endpoint `GET /api/v1/dashboard/outlet` does NOT
 * exist yet (ADR doc 45 §4, planning in doc 46). This renders the intended
 * LAYOUT with clearly-labelled STATIC SAMPLE DATA for visual review. Sales
 * figures depend on the future Sales module; stock figures come from Inventory.
 * All numbers are placeholders — not live data.
 */
import { ERPPage, ERPPageHeader, ERPContent, ERPCard, ERPDataTable, ERPStatusBadge, type ERPTableColumn } from '@/components/erp';

interface Kpi {
  key: string;
  label: string;
  value: string;
  source: 'sales' | 'inventory';
}

interface LowStockRow {
  id: string;
  product: string;
  remaining: number;
  minimum: number;
}

// ── Static sample data (visual review only) ──────────────────────────
const outletName = 'Outlet Pusat';

const kpis: Kpi[] = [
  { key: 'revenue', label: 'Penjualan Hari Ini', value: 'Rp 1.920.000', source: 'sales' },
  { key: 'tx', label: 'Transaksi Hari Ini', value: '54', source: 'sales' },
  { key: 'lowStock', label: 'Stok Menipis', value: '4', source: 'inventory' },
  { key: 'expiring', label: 'Akan Kedaluwarsa', value: '3', source: 'inventory' },
];

const lowStockColumns: ERPTableColumn[] = [
  { key: 'product', label: 'Produk' },
  { key: 'ratio', label: 'Sisa / Min', cellClass: 'text-right' },
];

const lowStock: LowStockRow[] = [
  { id: '1', product: 'Tepung Terigu Protein Tinggi', remaining: 3, minimum: 10 },
  { id: '2', product: 'Ragi Instan', remaining: 2, minimum: 6 },
  { id: '3', product: 'Gula Halus', remaining: 5, minimum: 12 },
];
</script>

<template>
  <ERPPage>
    <ERPPageHeader
      title="Outlet Dashboard"
      :description="`Ringkasan ${outletName} · data contoh untuk tinjauan layout.`"
    >
      <template #actions>
        <ERPStatusBadge tone="muted" label="Data contoh" />
      </template>
    </ERPPageHeader>

    <ERPContent>
      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ERPCard v-for="kpi in kpis" :key="kpi.key">
            <div class="space-y-2">
              <p class="text-sm text-muted">{{ kpi.label }}</p>
              <p class="text-2xl font-semibold text-foreground">{{ kpi.value }}</p>
              <ERPStatusBadge
                :tone="kpi.source === 'inventory' ? 'success' : 'muted'"
                :label="kpi.source === 'inventory' ? 'Dari Inventory' : 'Menunggu modul Sales'"
              />
            </div>
          </ERPCard>
        </div>

        <ERPCard title="Produk Stok Menipis di Outlet Ini">
          <template #actions>
            <ERPStatusBadge tone="success" label="Inventory" />
          </template>
          <ERPDataTable
            :columns="lowStockColumns"
            :rows="lowStock"
            row-key="id"
            empty-title="Semua stok di atas minimum"
          >
            <template #cell-ratio="{ row }">
              <span class="font-medium text-danger">{{ row.remaining }} / {{ row.minimum }}</span>
            </template>
          </ERPDataTable>
        </ERPCard>
      </div>
    </ERPContent>
  </ERPPage>
</template>
