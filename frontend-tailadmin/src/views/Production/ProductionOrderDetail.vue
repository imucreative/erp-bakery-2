<script setup lang="ts">
/**
 * ProductionOrderDetail — full-page READ-ONLY view of a Production Order. Since
 * production is instant-complete, an order is always COMPLETED and final: there
 * are no lifecycle actions. The view shows the header summary (product, recipe,
 * outlet, target/success/waste, dates, notes), the consumed materials, and the
 * produced finished-goods batches.
 *
 * This view owns load state only; presentation is delegated to stateless feature
 * sub-components. Display names for the order, materials and batches come from
 * the production-order response, so opening detail needs no master/inventory
 * permissions.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import { BaseAlert, BaseButton } from '@/components/ui'
import {
  ProductionOrderSummary,
  ProductionOrderMaterialsTable,
  ProductionOrderResultsTable,
} from '@/components/production/production-order'
import { toMessage } from '@/composables/useStockLedger'
import {
  productionOrderService,
  statusBadgeColor,
  PRODUCTION_ORDER_STATUS_LABELS,
  type ProductionOrder,
} from '@/services/production-order.service'

const route = useRoute()
const router = useRouter()

const orderId = computed<string>(() => String(route.params.id))

const order = ref<ProductionOrder | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)

function outletName(id: string): string {
  return order.value?.outletId === id ? (order.value.outletName ?? id) : id
}
function productName(id: string): string {
  if (order.value?.productId === id && order.value.productName) {
    return order.value.productName
  }
  return order.value?.materials.find((material) => material.productId === id)?.productName ?? id
}
function recipeName(id: string): string {
  return order.value?.recipeId === id ? (order.value.recipeName ?? id) : id
}
function batchLabel(id: string): string {
  return order.value?.materials.find((material) => material.batchId === id)?.batchNumber ?? id
}

// ── Load ─────────────────────────────────────────────────────────────
async function loadOrder(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    order.value = await productionOrderService.getById(orderId.value)
  } catch (error) {
    loadError.value = toMessage(error)
    order.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOrder()
})

function goToList(): void {
  void router.push({ name: 'ProductionOrders' })
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="'Detail Production Order'" />

    <div v-if="loading" class="panel-loading">Memuat data...</div>

    <BaseAlert v-else-if="loadError" :message="loadError" size="md" class="rounded-2xl py-4" />

    <template v-else-if="order">
      <!-- Page header: back (icon-only) + number + status badge -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <BaseButton
            variant="outline"
            icon-only
            aria-label="Kembali ke Daftar"
            title="Kembali ke Daftar"
            class="h-10 w-10"
            @click="goToList"
          >
            <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </BaseButton>
          <h3 class="card-title">
            {{ order.productionNumber }}
          </h3>
        </div>
        <Badge :color="statusBadgeColor(order.status)">
          {{ PRODUCTION_ORDER_STATUS_LABELS[order.status] }}
        </Badge>
      </div>

      <div class="grid grid-cols-1 gap-5">
        <ComponentCard title="Informasi Perintah Produksi">
          <ProductionOrderSummary
            :order="order"
            :product-name="productName"
            :outlet-name="outletName"
            :recipe-name="recipeName"
          />
        </ComponentCard>

        <ComponentCard title="Bahan Baku Dikonsumsi">
          <ProductionOrderMaterialsTable
            v-if="order.materials.length > 0"
            :materials="order.materials"
            :product-name="productName"
            :batch-label="batchLabel"
          />
          <p v-else class="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada bahan baku yang tercatat.
          </p>
        </ComponentCard>

        <ComponentCard title="Hasil Produksi (Batch Barang Jadi)">
          <ProductionOrderResultsTable
            v-if="order.results.length > 0"
            :results="order.results"
            :product-name="productName"
          />
          <p v-else class="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada batch barang jadi (tidak ada hasil yang berhasil).
          </p>
        </ComponentCard>
      </div>
    </template>
  </AdminLayout>
</template>
