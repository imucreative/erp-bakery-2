<script setup lang="ts">
/**
 * OwnerDashboard — company-wide overview.
 *
 * NOTE: the backend metrics endpoint `GET /api/v1/dashboard/owner` does NOT
 * exist yet (ADR doc 45 §4, planning in doc 46). This view renders the intended
 * LAYOUT with clearly-labelled STATIC SAMPLE DATA so the information design can
 * be reviewed. Revenue/sales figures depend on the future Sales module and are
 * marked "menunggu Sales"; low-stock/expiry come from Inventory (already
 * available) and will be wired to a real endpoint later. All numbers here are
 * placeholders for visual review — not live data.
 */
import { ERPPage, ERPPageHeader, ERPContent, ERPCard, ERPDataTable, ERPStatusBadge, type ERPTableColumn } from '@/components/erp';

interface Kpi {
  key: string;
  label: string;
  value: string;
  source: 'sales' | 'inventory';
}

interface ExpiringRow {
  id: string;
  product: string;
  outlet: string;
  daysLeft: number;
}

interface LowStockRow {
  id: string;
  product: string;
  outlet: string;
  remaining: number;
  minimum: number;
}

// ── Static sample data (visual review only) ──────────────────────────
const kpis: Kpi[] = [
  { key: 'revenue', label: 'Pendapatan Hari Ini', value: 'Rp 4.850.000', source: 'sales' },
  { key: 'sales', label: 'Transaksi Hari Ini', value: '128', source: 'sales' },
  { key: 'lowStock', label: 'Stok Menipis', value: '10', source: 'inventory' },
  { key: 'expired', label: 'Produk Kedaluwarsa', value: '2', source: 'inventory' },
];

const expiringColumns: ERPTableColumn[] = [
  { key: 'product', label: 'Produk' },
  { key: 'outlet', label: 'Outlet' },
  { key: 'daysLeft', label: 'Sisa Hari', cellClass: 'text-right' },
];

const expiringSoon: ExpiringRow[] = [
  { id: '1', product: 'Roti Tawar Gandum', outlet: 'Outlet Pusat', daysLeft: 2 },
  { id: '2', product: 'Croissant Butter', outlet: 'Outlet Pusat', daysLeft: 5 },
  { id: '3', product: 'Donat Coklat', outlet: 'Outlet Bandung', daysLeft: 12 },
  { id: '4', product: 'Bolu Pandan', outlet: 'Outlet Bandung', daysLeft: 21 },
];

const lowStockColumns: ERPTableColumn[] = [
  { key: 'product', label: 'Produk' },
  { key: 'outlet', label: 'Outlet' },
  { key: 'ratio', label: 'Sisa / Min', cellClass: 'text-right' },
];

const lowStock: LowStockRow[] = [
  { id: '1', product: 'Tepung Terigu Protein Tinggi', outlet: 'Outlet Pusat', remaining: 3, minimum: 10 },
  { id: '2', product: 'Mentega Tawar', outlet: 'Outlet Bandung', remaining: 1, minimum: 8 },
  { id: '3', product: 'Ragi Instan', outlet: 'Outlet Pusat', remaining: 2, minimum: 6 },
];
</script>

<template>
  <ERPPage>
    <ERPPageHeader
      title="Owner Dashboard"
      description="Ringkasan performa perusahaan · data contoh untuk tinjauan layout."
    >
      <template #actions>
        <ERPStatusBadge tone="muted" label="Data contoh" />
      </template>
    </ERPPageHeader>

    <ERPContent>
      <div class="space-y-6">
        <!-- KPI row -->
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

        <!-- Trend + expiring -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ERPCard
            class="lg:col-span-2"
            title="Tren Penjualan 7 Hari"
            description="Grafik akan tersedia setelah modul Sales dibangun."
          >
            <template #actions>
              <ERPStatusBadge tone="muted" label="Menunggu Sales" />
            </template>
            <div
              class="flex h-48 items-end gap-3"
              role="img"
              aria-label="Contoh tren penjualan tujuh hari (data statis)"
            >
              <div
                v-for="(h, i) in [40, 62, 55, 78, 66, 85, 72]"
                :key="i"
                class="flex-1 rounded-t-lg bg-primary/30"
                :style="{ height: h + '%' }"
              />
            </div>
          </ERPCard>

          <ERPCard title="Akan Kedaluwarsa (≤30 hari)">
            <template #actions>
              <ERPStatusBadge tone="success" label="Inventory" />
            </template>
            <ERPDataTable
              :columns="expiringColumns"
              :rows="expiringSoon"
              row-key="id"
              empty-title="Tidak ada batch mendekati kedaluwarsa"
            >
              <template #cell-daysLeft="{ row }">
                <span :class="row.daysLeft <= 3 ? 'font-semibold text-danger' : 'text-foreground'">
                  {{ row.daysLeft }} hari
                </span>
              </template>
            </ERPDataTable>
          </ERPCard>
        </div>

        <!-- Low stock table -->
        <ERPCard title="Produk Stok Menipis">
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
