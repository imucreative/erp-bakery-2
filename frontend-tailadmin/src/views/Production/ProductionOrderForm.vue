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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Factory } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import { ProductionOrderHeaderFields } from '@/components/production/production-order'
import { toISODate } from '@/lib/format'
import { toMessage } from '@/composables/useStockLedger'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { recipeService } from '@/services/recipe.service'
import {
  productionOrderService,
  type CreateProductionOrderPayload,
} from '@/services/production-order.service'

const router = useRouter()
const pageTitle = 'Produksi'
const PRODUCT_SEARCH_LIMIT = 10
const PRODUCT_SEARCH_DEBOUNCE_MS = 300

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

// ACTIVE recipe for the chosen product (resolved on select).
const recipeInfo = ref<string | null>(null)
const recipeMissing = ref<boolean>(false)

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
  recipeInfo.value = null
  recipeMissing.value = false
  try {
    const result = await recipeService.list({
      page: 1,
      limit: 1,
      productId: product.id,
      status: 'ACTIVE',
    })
    const recipe = result.items[0]
    if (recipe) {
      recipeInfo.value = `${recipe.name} (${recipe.recipeNumber})`
    } else {
      recipeMissing.value = true
    }
  } catch {
    // Non-fatal: leave recipe info empty; the backend validates on submit.
    recipeInfo.value = null
  }
}

function onProductClear(): void {
  productId.value = ''
  productLabel.value = ''
  productResults.value = []
  recipeInfo.value = null
  recipeMissing.value = false
}

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
          :recipe-info="recipeInfo"
          :recipe-missing="recipeMissing"
          :disabled="submitting"
          @product-search="onProductSearch"
          @product-select="onProductSelect"
          @product-clear="onProductClear"
        />

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
