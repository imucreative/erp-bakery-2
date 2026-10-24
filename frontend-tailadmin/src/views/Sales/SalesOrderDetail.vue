<script setup lang="ts">
/**
 * SalesOrderDetail — full-page read-only view of a Sales Order: summary + line
 * items (with topping sub-rows) + payments, plus a refund block when REFUNDED.
 * Renders status- and permission-aware lifecycle actions (doc 51 §6.1):
 *
 *   PENDING_PAYMENT → Void (sales.manage)
 *   PAID            → Refund (sales.manage — full-order, posts stock reversal)
 *   CANCELLED / REFUNDED → terminal (no actions)
 *
 * Void/refund go through a confirmation modal. Mutations keep the user on the
 * page; backend errors surface in the modal. The view owns all state and
 * handlers; presentation is delegated to stateless feature sub-components.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import {
  SalesOrderSummary,
  SalesOrderItemsTable,
  SalesOrderPaymentsTable,
  SalesOrderActionBar,
  SalesOrderActionModals,
  type SalesOrderAction,
} from '@/components/sales'
import { BaseButton } from '@/components/ui'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/useSalesOrders'
import { salesService, type SalesOrder } from '@/services/sales.service'
import { formatRupiah, formatDateTime } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const orderId = computed<string>(() => String(route.params.id))

const order = ref<SalesOrder | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

function outletName(id: string): string {
  return order.value?.outletId === id ? (order.value.outletName ?? id) : id
}
function cashierName(id: string): string {
  return order.value?.cashierUserId === id ? (order.value.cashierName ?? id) : id
}

// ── Permission + status → available actions ──────────────────────────
const canManage = computed<boolean>(() => can('sales.manage'))
const status = computed<SalesOrder['status'] | null>(() => order.value?.status ?? null)

const showVoid = computed<boolean>(() => canManage.value && status.value === 'PENDING_PAYMENT')
const showRefund = computed<boolean>(() => canManage.value && status.value === 'PAID')
const hasAnyAction = computed<boolean>(() => showVoid.value || showRefund.value)

// ── Load ─────────────────────────────────────────────────────────────
async function loadOrder(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    order.value = await salesService.orders.getById(orderId.value)
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

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<SalesOrderAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToList(): void {
  void router.push({ name: 'SalesOrders' })
}

function openAction(action: SalesOrderAction): void {
  activeAction.value = action
  actionError.value = null
}

async function onConfirmAction(reason: string): Promise<void> {
  if (!order.value || !activeAction.value) {
    return
  }
  const id = order.value.id
  const outletName = order.value.outletName
  const cashierName = order.value.cashierName
  actionSubmitting.value = true
  actionError.value = null
  try {
    if (activeAction.value === 'void') {
      order.value = {
        ...(await salesService.orders.void(id)),
        outletName,
        cashierName,
      }
    } else if (activeAction.value === 'refund') {
      order.value = {
        ...(await salesService.orders.refund(id, {
          reason: reason || undefined,
        })),
        outletName,
        cashierName,
      }
    }
    activeAction.value = null
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="'Detail Sales Order'" />

    <div v-if="loading" class="panel-loading">Memuat data...</div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-error-500/40 bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ loadError }}
    </div>

    <template v-else-if="order">
      <!-- Page header: back (icon-only) + title on the start, lifecycle actions on the end -->
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
            {{ order.invoiceNumber }}
          </h3>
        </div>

        <SalesOrderActionBar
          v-if="hasAnyAction"
          :show-void="showVoid"
          :show-refund="showRefund"
          :submitting="actionSubmitting"
          @void="openAction('void')"
          @refund="openAction('refund')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <!-- Main column: summary + items -->
        <div class="space-y-5 lg:col-span-2">
          <ComponentCard title="Informasi Sales Order">
            <p v-if="actionError" class="alert-error mb-4 px-3 py-2">
              {{ actionError }}
            </p>

            <SalesOrderSummary
              :order="order"
              :outlet-name="outletName"
              :cashier-name="cashierName"
            />

            <div class="mt-6">
              <h4 class="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                Item
              </h4>
              <SalesOrderItemsTable :order="order" />
            </div>

            <p v-if="!hasAnyAction" class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500">
              Tidak ada aksi untuk status ini.
            </p>
          </ComponentCard>
        </div>

        <!-- Side column: payments + refund block -->
        <div class="space-y-5 lg:col-span-1">
          <ComponentCard title="Pembayaran">
            <SalesOrderPaymentsTable :payments="order.payments" />
          </ComponentCard>

          <ComponentCard v-if="order.status === 'REFUNDED' && order.salesReturn" title="Refund">
            <dl class="space-y-3">
              <div class="flex items-center justify-between text-theme-sm">
                <dt class="text-gray-500 dark:text-gray-400">Jumlah Refund</dt>
                <dd class="font-medium text-gray-800 dark:text-white/90">
                  {{ formatRupiah(order.salesReturn.refundAmount) }}
                </dd>
              </div>
              <div class="flex items-center justify-between text-theme-sm">
                <dt class="text-gray-500 dark:text-gray-400">Tanggal</dt>
                <dd class="text-gray-800 dark:text-white/90">
                  {{ formatDateTime(order.salesReturn.createdAt) }}
                </dd>
              </div>
              <div v-if="order.salesReturn.reason">
                <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Alasan</dt>
                <dd class="mt-1 text-body">
                  {{ order.salesReturn.reason }}
                </dd>
              </div>
            </dl>
          </ComponentCard>
        </div>
      </div>
    </template>

    <SalesOrderActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
