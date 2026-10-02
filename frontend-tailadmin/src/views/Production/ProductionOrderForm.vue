<script setup lang="ts">
/**
 * ProductionOrderForm — full-page create (schedule) form for a Production Order.
 * A page (not a modal) to leave room for the header fields and consistency with
 * the other document forms. There is NO edit mode: the backend has no update
 * endpoint for a scheduled order, so this view only ever creates.
 *
 * Design decision (user): the user picks a FINISHED PRODUCT, not a recipe. We
 * submit `productId`; the backend resolves the product's ACTIVE recipe. To keep
 * the picker clean we filter the product list to products that actually have an
 * ACTIVE recipe (gathered from the recipe list with status=ACTIVE) and show the
 * resolved recipe name as read-only info once a product is chosen. If the
 * backend still rejects the schedule (e.g. no ACTIVE recipe), we surface the
 * message and keep the user on the page.
 *
 * Validation (mirrors the backend): outlet + product + a positive scheduledQty
 * are required; productionDate is optional. On success → detail page.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import { ProductionOrderHeaderFields } from '@/components/production/production-order'
import { toISODate } from '@/lib/format'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { toMessage } from '@/composables/useStockLedger'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { recipeService } from '@/services/recipe.service'
import {
  productionOrderService,
  type ScheduleProductionOrderPayload,
} from '@/services/production-order.service'

const router = useRouter()
const pageTitle = 'Jadwalkan Produksi'

// ── Supporting data ──────────────────────────────────────────────────
const outlets = ref<Outlet[]>([])
// Products that own an ACTIVE recipe (the only ones schedulable).
const schedulableProducts = ref<Product[]>([])
// productId → ACTIVE recipe label (name + number) for the read-only info line.
const recipeByProduct = ref<Map<string, string>>(new Map())

// ── Form state ───────────────────────────────────────────────────────
const outletId = ref<string>('')
const productId = ref<string>('')
const scheduledQty = ref<number | null>(null)
const productionDate = ref<string>(toISODate(new Date()))
const notes = ref<string>('')

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

const recipeInfo = computed<string | null>(() =>
  productId.value ? (recipeByProduct.value.get(productId.value) ?? null) : null,
)

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    const [allOutlets, allProducts, activeRecipes] = await Promise.all([
      fetchAllPaginated((p) => outletService.list({ page: p, limit: PAGE_LIMIT })),
      fetchAllPaginated((p) => productService.list({ page: p, limit: PAGE_LIMIT })),
      fetchAllPaginated((p) =>
        recipeService.list({ page: p, limit: PAGE_LIMIT, status: 'ACTIVE' }),
      ),
    ])
    outlets.value = allOutlets

    // Map productId → one ACTIVE recipe label (a product has at most one ACTIVE
    // recipe per the backend's single-active-recipe rule).
    const recipeMap = new Map<string, string>()
    for (const recipe of activeRecipes) {
      recipeMap.set(recipe.productId, `${recipe.name} (${recipe.recipeNumber})`)
    }
    recipeByProduct.value = recipeMap

    // Only products with an ACTIVE recipe can be scheduled.
    const productMap = new Map(allProducts.map((product) => [product.id, product]))
    schedulableProducts.value = Array.from(recipeMap.keys())
      .map((id) => productMap.get(id))
      .filter((product): product is Product => product !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    loading.value = false
  }
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!outletId.value) {
    return 'Outlet wajib dipilih.'
  }
  if (!productId.value) {
    return 'Produk jadi wajib dipilih.'
  }
  const qty = Number(scheduledQty.value) || 0
  if (qty <= 0) {
    return 'Qty rencana harus lebih dari 0.'
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
    const payload: ScheduleProductionOrderPayload = {
      outletId: outletId.value,
      productId: productId.value,
      scheduledQty: Number(scheduledQty.value) || 0,
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
          v-if="schedulableProducts.length === 0"
          class="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        >
          Belum ada produk yang memiliki resep aktif. Aktifkan sebuah resep terlebih dahulu sebelum
          menjadwalkan produksi.
        </p>

        <ProductionOrderHeaderFields
          v-model:outlet-id="outletId"
          v-model:product-id="productId"
          v-model:scheduled-qty="scheduledQty"
          v-model:production-date="productionDate"
          v-model:notes="notes"
          :outlets="outlets"
          :products="schedulableProducts"
          :recipe-info="recipeInfo"
          :disabled="submitting"
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
            :disabled="submitting || schedulableProducts.length === 0"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting ? 'Menjadwalkan...' : 'Jadwalkan Produksi' }}
          </button>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
