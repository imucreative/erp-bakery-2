<script setup lang="ts">
/**
 * ProductionOrderForm — full-page INSTANT-COMPLETE production form. Submitting
 * runs the whole production in one action: the backend backflushes ingredients
 * (FEFO) and produces the finished-goods batch atomically, landing the order on
 * COMPLETED. There is no edit mode and no lifecycle.
 *
 * Design decisions (user):
 *  - Outlet comes from GET /outlets/accessible. One accessible outlet → auto-
 *    select and lock the field read-only; many → a picker of only those outlets.
 *  - The user picks a FINISHED PRODUCT via a SERVER-SIDE AUTOCOMPLETE (we never
 *    load every product): typing debounces into productService.list({ search,
 *    productType: FINISHED_GOODS, isActive }). On select we look up the product's
 *    ACTIVE recipe (recipeService.list) and show it read-only; a missing ACTIVE
 *    recipe is a soft warning — the backend remains the authority and rejects
 *    with RECIPE.NO_ACTIVE_RECIPE, which we surface.
 *
 * Light client validation mirrors the backend (target>0, actual>=0, waste>=0,
 * result expiry required when actual>0). On failure we stay on the page, surface
 * the backend message, and keep the inputs intact. On success → detail page.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, ChevronLeft, Factory } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseAlert, BaseButton } from '@/components/ui'
import {
  ProductionOrderHeaderFields,
  ProductionProduciblePanel,
} from '@/components/production/production-order'
import { formatNumber, toISODate } from '@/lib/format'
import { toMessage } from '@/composables/useStockLedger'
import { ApiClientError } from '@/services/http'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { recipeService } from '@/services/recipe.service'
import {
  productionOrderService,
  type CreateProductionOrderPayload,
  type ProducibleInfo,
} from '@/services/production-order.service'

const router = useRouter()
const pageTitle = 'Produksi'
const PRODUCT_SEARCH_LIMIT = 10
const PRODUCT_SEARCH_DEBOUNCE_MS = 300
const PRODUCIBLE_DEBOUNCE_MS = 250

// ── Supporting data ──────────────────────────────────────────────────
const outlets = ref<Outlet[]>([])
const outletLocked = computed<boolean>(() => outlets.value.length === 1)

// Product autocomplete.
const productResults = ref<Product[]>([])
const productSearching = ref<boolean>(false)
let productSearchTimer: ReturnType<typeof setTimeout> | undefined

// ── Form state ───────────────────────────────────────────────────────
const outletId = ref<string>('')
const productId = ref<string>('')
const productLabel = ref<string>('')
const scheduledQty = ref<number | null>(null)
const actualQty = ref<number | null>(null)
const wasteQty = ref<number | null>(0)
const resultExpiredDate = ref<string>('')
const productionDate = ref<string>(toISODate(new Date()))
const notes = ref<string>('')

// ACTIVE recipe presence for the chosen product. The recipe NAME is shown in the
// producible panel below (single source), so HeaderFields only needs the
// "missing recipe" soft warning that mirrors the backend rejection.
const recipeMissing = ref<boolean>(false)

// ── Producible (production capacity) preview ─────────────────────────
const producibleInfo = ref<ProducibleInfo | null>(null)
const producibleLoading = ref<boolean>(false)
const producibleError = ref<string | null>(null)
let producibleTimer: ReturnType<typeof setTimeout> | undefined
// Monotonic token so a slow earlier request can't overwrite a newer result.
let producibleRequestId = 0

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    outlets.value = await outletService.getAccessible()
    if (outlets.value.length === 1) {
      outletId.value = outlets.value[0]!.id
    }
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    loading.value = false
  }
})

// ── Product autocomplete handlers ────────────────────────────────────
function onProductSearch(query: string): void {
  if (productSearchTimer) {
    clearTimeout(productSearchTimer)
  }
  if (query.length === 0) {
    productResults.value = []
    productSearching.value = false
    return
  }
  productSearching.value = true
  productSearchTimer = setTimeout(async () => {
    try {
      const result = await productService.list({
        page: 1,
        limit: PRODUCT_SEARCH_LIMIT,
        search: query,
        productType: 'FINISHED_GOODS',
        isActive: 'true',
      })
      productResults.value = result.items
    } catch {
      productResults.value = []
    } finally {
      productSearching.value = false
    }
  }, PRODUCT_SEARCH_DEBOUNCE_MS)
}

async function onProductSelect(product: Product): Promise<void> {
  productId.value = product.id
  productLabel.value = `${product.name} (${product.sku})`
  productResults.value = []
  recipeMissing.value = false
  try {
    const result = await recipeService.list({
      page: 1,
      limit: 1,
      productId: product.id,
      status: 'ACTIVE',
    })
    recipeMissing.value = result.items.length === 0
  } catch {
    // Non-fatal: the backend validates on submit and the producible panel will
    // also surface a missing recipe (404 RECIPE.NO_ACTIVE_RECIPE).
    recipeMissing.value = false
  }
}

function onProductClear(): void {
  productId.value = ''
  productLabel.value = ''
  productResults.value = []
  recipeMissing.value = false
}

// ── Producible preview: fetch when BOTH product + outlet are set ──────
function resetProducible(): void {
  producibleInfo.value = null
  producibleError.value = null
  producibleLoading.value = false
}

async function loadProducible(product: string, outlet: string): Promise<void> {
  const requestId = ++producibleRequestId
  producibleLoading.value = true
  producibleError.value = null
  producibleInfo.value = null
  try {
    const info = await productionOrderService.getProducible(product, outlet)
    if (requestId !== producibleRequestId) {
      return // A newer request superseded this one.
    }
    producibleInfo.value = info
    recipeMissing.value = false
  } catch (error) {
    if (requestId !== producibleRequestId) {
      return
    }
    // A 404 whose message points at the recipe → no ACTIVE recipe (soft state).
    if (error instanceof ApiClientError && error.status === 404 && /recipe/i.test(error.message)) {
      recipeMissing.value = true
      producibleError.value = null
    } else {
      producibleError.value = toMessage(error)
    }
  } finally {
    if (requestId === producibleRequestId) {
      producibleLoading.value = false
    }
  }
}

watch([productId, outletId], ([product, outlet]) => {
  if (producibleTimer) {
    clearTimeout(producibleTimer)
  }
  if (!product || !outlet) {
    resetProducible()
    return
  }
  producibleTimer = setTimeout(() => {
    void loadProducible(product, outlet)
  }, PRODUCIBLE_DEBOUNCE_MS)
})

// HARD validation: the user entered more successful units (actualQty) than the
// computed production capacity (producibleQty). This blocks submit because the
// backend would reject it with INVENTORY.INSUFFICIENT_STOCK.
//
// Comparison basis: actualQty vs producibleQty. The backend consumes ingredients
// based on what is actually PRODUCED (lands in stock = actualQty); loss/waste no
// longer consumes stock, so wasteQty is intentionally NOT part of this check.
//
// Guard against stale/absent data: only block when the producible figure is
// genuinely KNOWN — i.e. the capacity panel has loaded a result for the current
// product+outlet (producibleInfo present, not loading, no fetch error). While
// loading, on fetch error, or before the panel is loaded, we do NOT block on a
// stale value — the backend stays the final authority. producibleQty is computed
// from stock at load time and stock can change, so this is early prevention only;
// on a race the backend still rejects and we surface its message on the page.
const overProducibleBlocked = computed<boolean>(() => {
  const info = producibleInfo.value
  if (!info || producibleLoading.value || producibleError.value !== null) {
    return false
  }
  const actual = actualQty.value
  if (actual === null || Number.isNaN(Number(actual))) {
    return false
  }
  return Number(actual) > info.producibleQty
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!outletId.value) {
    return 'Outlet wajib dipilih.'
  }
  if (!productId.value) {
    return 'Produk jadi wajib dipilih.'
  }
  const target = Number(scheduledQty.value) || 0
  if (target <= 0) {
    return 'Target harus lebih dari 0.'
  }
  const actual = Number(actualQty.value)
  if (actualQty.value === null || Number.isNaN(actual) || actual < 0) {
    return 'Jumlah berhasil harus 0 atau lebih.'
  }
  const waste = Number(wasteQty.value) || 0
  if (waste < 0) {
    return 'Jumlah gagal/terbuang tidak boleh negatif.'
  }
  if (actual > 0 && !resultExpiredDate.value) {
    return 'Tanggal kedaluwarsa hasil wajib diisi bila ada hasil yang berhasil.'
  }
  return null
}

async function onSubmit(): Promise<void> {
  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    return
  }
  // Hard block: refuse to submit when the entered successful quantity exceeds the
  // KNOWN production capacity. Mirrors the disabled submit button; the computed
  // guard already ignores unknown/loading/errored producible figures.
  if (overProducibleBlocked.value) {
    formError.value = `Jumlah berhasil (${formatNumber(actualQty.value)}) melebihi maksimal yang bisa diproduksi (${formatNumber(producibleInfo.value?.producibleQty)}). Kurangi jumlah atau tambah stok bahan.`
    return
  }
  formError.value = null
  submitting.value = true
  try {
    const actual = Number(actualQty.value) || 0
    const payload: CreateProductionOrderPayload = {
      outletId: outletId.value,
      productId: productId.value,
      scheduledQty: Number(scheduledQty.value) || 0,
      actualQty: actual,
      wasteQty: Number(wasteQty.value) || 0,
      resultExpiredDate: actual > 0 ? resultExpiredDate.value : undefined,
      productionDate: productionDate.value || undefined,
      notes: notes.value.trim() || undefined,
    }
    const saved = await productionOrderService.create(payload)
    void router.push({ name: 'ProductionOrderDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'ProductionOrders' })
}

onBeforeUnmount(() => {
  if (producibleTimer) {
    clearTimeout(producibleTimer)
  }
  if (productSearchTimer) {
    clearTimeout(productSearchTimer)
  }
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <!-- Page header: back (icon-only) + title on the start -->
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <BaseButton
        variant="outline"
        icon-only
        aria-label="Kembali ke Daftar"
        title="Kembali ke Daftar"
        class="h-10 w-10"
        @click="onCancel"
      >
        <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
      </BaseButton>
      <h3 class="card-title">
        {{ pageTitle }}
      </h3>
    </div>

    <ComponentCard :title="pageTitle">
      <div v-if="loading" class="text-muted py-10 text-center">Memuat data...</div>

      <BaseAlert v-else-if="loadError" :message="loadError" size="md" />

      <form v-else class="space-y-6" @submit.prevent="onSubmit">
        <BaseAlert
          v-if="outlets.length === 0"
          variant="warning"
          size="md"
          class="dark:text-orange-400"
        >
          Anda belum memiliki akses ke outlet mana pun. Hubungi admin untuk penugasan outlet.
        </BaseAlert>

        <ProductionOrderHeaderFields
          v-model:outlet-id="outletId"
          v-model:scheduled-qty="scheduledQty"
          v-model:actual-qty="actualQty"
          v-model:waste-qty="wasteQty"
          v-model:result-expired-date="resultExpiredDate"
          v-model:production-date="productionDate"
          v-model:notes="notes"
          :product-id="productId"
          :product-label="productLabel"
          :outlets="outlets"
          :outlet-locked="outletLocked"
          :product-results="productResults"
          :product-searching="productSearching"
          :recipe-info="null"
          :recipe-missing="recipeMissing"
          :disabled="submitting"
          @product-search="onProductSearch"
          @product-select="onProductSelect"
          @product-clear="onProductClear"
        />

        <ProductionProduciblePanel
          v-if="productId && outletId"
          :info="producibleInfo"
          :loading="producibleLoading"
          :recipe-missing="recipeMissing"
          :error="producibleError"
        />

        <BaseAlert v-if="overProducibleBlocked" variant="error" size="sm">
          <template #icon>
            <AlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
          </template>
          Jumlah berhasil ({{ formatNumber(actualQty) }}) melebihi maksimal yang bisa diproduksi ({{
            formatNumber(producibleInfo?.producibleQty)
          }}). Kurangi jumlah atau tambah stok bahan.
        </BaseAlert>

        <BaseAlert v-if="formError" :message="formError" size="sm" />

        <div class="button-row pt-2">
          <BaseButton size="sm" variant="outline" :disabled="submitting" @click="onCancel">
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            size="sm"
            variant="primary"
            :disabled="outlets.length === 0 || overProducibleBlocked"
            :loading="submitting"
            loading-text="Memproses..."
          >
            <template #start-icon>
              <Factory class="h-4 w-4" aria-hidden="true" />
            </template>
            Jalankan Produksi
          </BaseButton>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
