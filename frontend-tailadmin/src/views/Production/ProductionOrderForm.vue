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
import Button from '@/components/ui/Button.vue'
import {
  ProductionOrderHeaderFields,
  ProductionProduciblePanel,
} from '@/components/production/production-order'
import { formatNumber, toISODate } from '@/lib/format'
import { toMessage } from '@/composables/useStockLedger'
import { fetchAllPaginated } from '@/lib/fetchAll'
import { ApiClientError } from '@/services/http'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { uomService, type Uom } from '@/services/uom.service'
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
const RESOLVE_PAGE_LIMIT = 100

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

// Lazy-loaded id→name resolvers for the ingredient table + yield UOM. Both the
// product and UOM masters are loaded ONCE on first need (not per row) to avoid
// N+1 — the producible items[] only carry ids. Mirrors RecipeDetail resolution.
const productNames = ref<Map<string, string>>(new Map())
const uomNames = ref<Map<string, string>>(new Map())
const mastersLoaded = ref<boolean>(false)
let mastersPromise: Promise<void> | null = null

function ingredientName(id: string): string {
  return productNames.value.get(id) ?? 'Bahan tidak dikenal'
}

function uomName(id: string): string {
  return uomNames.value.get(id) ?? ''
}

/** Load the product + UOM name maps once (idempotent, shared promise). */
async function ensureMastersLoaded(): Promise<void> {
  if (mastersLoaded.value) {
    return
  }
  if (!mastersPromise) {
    mastersPromise = (async () => {
      const [allProducts, allUoms] = await Promise.all([
        fetchAllPaginated<Product>((page) =>
          productService.list({ page, limit: RESOLVE_PAGE_LIMIT }),
        ),
        fetchAllPaginated<Uom>((page) => uomService.list({ page, limit: RESOLVE_PAGE_LIMIT })),
      ])
      productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
      uomNames.value = new Map(allUoms.map((u) => [u.id, u.name]))
      mastersLoaded.value = true
    })().catch((error) => {
      // Non-fatal: names fall back to placeholders; reset so a retry can refetch.
      mastersPromise = null
      throw error
    })
  }
  await mastersPromise
}

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
    // Resolve ingredient/UOM names (once) in parallel with the preview fetch.
    const [info] = await Promise.all([
      productionOrderService.getProducible(product, outlet),
      ensureMastersLoaded().catch(() => undefined),
    ])
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

// Soft, non-blocking hint: the user entered more successful units than the
// computed capacity. Informative only — the backend remains the authority.
const overProducibleHint = computed<boolean>(() => {
  const info = producibleInfo.value
  const actual = actualQty.value
  if (!info || actual === null || Number.isNaN(Number(actual))) {
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
      <button
        type="button"
        aria-label="Kembali ke Daftar"
        title="Kembali ke Daftar"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        @click="onCancel"
      >
        <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
      </button>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ pageTitle }}
      </h3>
    </div>

    <ComponentCard :title="pageTitle">
      <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Memuat data...
      </div>

      <div
        v-else-if="loadError"
        class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        role="alert"
      >
        {{ loadError }}
      </div>

      <form v-else class="space-y-6" @submit.prevent="onSubmit">
        <p
          v-if="outlets.length === 0"
          class="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        >
          Anda belum memiliki akses ke outlet mana pun. Hubungi admin untuk penugasan outlet.
        </p>

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
          :ingredient-name="ingredientName"
          :uom-name="uomName"
        />

        <p
          v-if="overProducibleHint"
          class="flex items-center gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
          role="status"
        >
          <AlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
          Jumlah berhasil ({{ formatNumber(actualQty) }}) melebihi kapasitas yang dihitung ({{
            formatNumber(producibleInfo?.producibleQty)
          }}). Produksi mungkin ditolak backend bila stok bahan tidak mencukupi.
        </p>

        <p
          v-if="formError"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ formError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <Button size="sm" variant="outline" :disabled="submitting" :on-click="onCancel">
            Batal
          </Button>
          <button
            type="submit"
            :disabled="submitting || outlets.length === 0"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Factory class="h-4 w-4" aria-hidden="true" />
            {{ submitting ? 'Memproses...' : 'Jalankan Produksi' }}
          </button>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
