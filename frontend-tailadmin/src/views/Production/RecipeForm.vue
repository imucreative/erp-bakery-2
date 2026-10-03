<script setup lang="ts">
/**
 * RecipeForm — full-page create/edit form for a Recipe (BOM). A page (not a
 * modal) because ingredient lines need room (document-page standard).
 *
 * CREATE (route `ProductionRecipeCreate`): empty header + empty items.
 * EDIT (route `ProductionRecipeEdit`, :id): loads the recipe. Editing is ONLY
 *   allowed for DRAFT; any other status (ACTIVE/ARCHIVED) renders read-only
 *   with save hidden (ACTIVE recipes can never return to DRAFT — a new version
 *   means archive the old one and create a new recipe).
 *
 * Validation (mirrors the backend): name + finished product + yield qty (>0) +
 * yield UOM required; at least one ingredient; each ingredient needs a product,
 * a positive qty, a UOM, and a lossPercentage within 0..100. On success → detail.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  RecipeHeaderFields,
  RecipeItemsEditor,
  type RecipeEditorItemRow,
} from '@/components/production/recipe'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { toMessage } from '@/composables/useStockLedger'
import { useRecipeDraft } from '@/composables/useRecipeDraft'
import { productService, type Product } from '@/services/product.service'
import { uomService, type Uom } from '@/services/uom.service'
import {
  recipeService,
  type Recipe,
  type SaveRecipePayload,
  type RecipeStatus,
} from '@/services/recipe.service'

const route = useRoute()
const router = useRouter()
const { consumeDraft } = useRecipeDraft()

const PRODUCT_SEARCH_LIMIT = 10
const PRODUCT_SEARCH_DEBOUNCE_MS = 300

const editId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id.length > 0 ? id : null
})
const isEdit = computed<boolean>(() => editId.value !== null)
const pageTitle = computed<string>(() => (isEdit.value ? 'Edit Resep' : 'Buat Resep'))

// ── Supporting data ──────────────────────────────────────────────────
const products = ref<Product[]>([])
const uoms = ref<Uom[]>([])

// Finished-product ids that already own a live (DRAFT/ACTIVE) recipe and so must
// be hidden from the create picker (one live recipe per product). Empty in edit
// mode so the recipe being edited keeps its own product selectable.
const blockedProductIds = ref<string[]>([])

// ── Form state ───────────────────────────────────────────────────────
const name = ref<string>('')
const productId = ref<string>('')
const yieldQty = ref<number>(1)
const yieldUomId = ref<string>('')
const instructions = ref<string>('')
const items = ref<RecipeEditorItemRow[]>([])

// ── Finished-product autocomplete (server-side) ──────────────────────
// The finished-product picker is a server-side autocomplete (mirrors the
// production form) instead of loading every product: typing debounces into
// productService.list({ search, productType: FINISHED_GOODS, isActive }).
// `productSelectedLabel` keeps the chosen product's "name (sku)" so the chip
// stays correct even though search results come and go.
const productResults = ref<Product[]>([])
const productSearching = ref<boolean>(false)
const productSelectedLabel = ref<string>('')
let productSearchTimer: ReturnType<typeof setTimeout> | undefined

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const loadedStatus = ref<RecipeStatus | null>(null)

const isReadOnly = computed<boolean>(
  () => isEdit.value && loadedStatus.value !== null && loadedStatus.value !== 'DRAFT',
)

const productMap = computed<Map<string, Product>>(
  () => new Map(products.value.map((p) => [p.id, p])),
)

function productLabel(id: string): string {
  const product = productMap.value.get(id)
  return product ? `${product.name} (${product.sku})` : id
}

// ── Finished-product autocomplete handlers ───────────────────────────
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

function onProductSelect(product: Product): void {
  // productId + yield-UOM auto-fill are handled by HeaderFields via v-model; here
  // we only remember the chosen label for the chip and clear the result list.
  productSelectedLabel.value = `${product.name} (${product.sku})`
  productResults.value = []
}

function onProductClear(): void {
  productSelectedLabel.value = ''
  productResults.value = []
}

async function loadSupportingData(): Promise<void> {
  const [allProducts, allUoms] = await Promise.all([
    fetchAllPaginated<Product>((page) => productService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated<Uom>((page) => uomService.list({ page, limit: PAGE_LIMIT })),
  ])
  products.value = allProducts
  uoms.value = allUoms
}

/**
 * Build the set of finished-product ids blocked from the create picker: every
 * product that already owns a DRAFT or ACTIVE recipe. The list endpoint accepts
 * one status per call, so DRAFT and ACTIVE are fetched separately and unioned.
 * Only runs in create mode (edit mode must keep the current product selectable).
 */
async function loadBlockedProductIds(): Promise<void> {
  const [drafts, actives] = await Promise.all([
    fetchAllPaginated<Recipe>((page) =>
      recipeService.list({ page, limit: PAGE_LIMIT, status: 'DRAFT' }),
    ),
    fetchAllPaginated<Recipe>((page) =>
      recipeService.list({ page, limit: PAGE_LIMIT, status: 'ACTIVE' }),
    ),
  ])
  const blocked = new Set<string>()
  for (const recipe of [...drafts, ...actives]) {
    blocked.add(recipe.productId)
  }
  blockedProductIds.value = [...blocked]
}

/**
 * Prefill the create form from a "Duplikat ke Draft" source (ARCHIVED recipe).
 * Consumed once; a plain "Buat Resep" leaves the form empty. The finished
 * product is intentionally NOT copied — the create picker hides products that
 * already own a live recipe, so the user chooses the finished product fresh.
 */
function applyDuplicateDraft(): void {
  const draft = consumeDraft()
  if (!draft) {
    return
  }
  name.value = draft.name
  yieldQty.value = draft.yieldQty
  yieldUomId.value = draft.yieldUomId
  instructions.value = draft.instructions
  items.value = draft.items.map((item) => ({
    ingredientProductId: item.ingredientProductId,
    qty: item.qty,
    uomId: item.uomId,
    lossPercentage: item.lossPercentage,
  }))
}

async function loadExisting(id: string): Promise<void> {
  const recipe = await recipeService.getById(id)
  loadedStatus.value = recipe.status
  name.value = recipe.name
  productId.value = recipe.productId
  // Edit mode: keep the finished product shown as a chip. Resolve its label from
  // the loaded product masters (fall back to the id if unavailable).
  productSelectedLabel.value = productLabel(recipe.productId)
  yieldQty.value = recipe.yieldQty
  yieldUomId.value = recipe.yieldUomId
  instructions.value = recipe.instructions ?? ''
  items.value = recipe.items.map((item) => ({
    ingredientProductId: item.ingredientProductId,
    qty: item.qty,
    uomId: item.uomId,
    lossPercentage: item.lossPercentage,
  }))
}

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    await loadSupportingData()
    if (editId.value) {
      await loadExisting(editId.value)
    } else {
      // Create mode: hide products that already own a live recipe, then apply
      // any pending "Duplikat ke Draft" prefill.
      await loadBlockedProductIds()
      applyDuplicateDraft()
    }
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (productSearchTimer) {
    clearTimeout(productSearchTimer)
  }
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!name.value.trim()) {
    return 'Nama resep wajib diisi.'
  }
  if (!productId.value) {
    return 'Produk jadi wajib dipilih.'
  }
  if (!(Number(yieldQty.value) > 0)) {
    return 'Hasil per batch harus lebih dari 0.'
  }
  if (!yieldUomId.value) {
    return 'UOM hasil wajib dipilih.'
  }
  if (items.value.length === 0) {
    return 'Minimal satu bahan harus ditambahkan.'
  }
  const seenIngredients = new Set<string>()
  for (let i = 0; i < items.value.length; i += 1) {
    const item = items.value[i]
    const position = `Baris ${i + 1}`
    if (!item.ingredientProductId) {
      return `${position}: bahan wajib dipilih.`
    }
    if (seenIngredients.has(item.ingredientProductId)) {
      return `${position}: bahan ${productLabel(item.ingredientProductId)} tidak boleh muncul lebih dari satu kali.`
    }
    seenIngredients.add(item.ingredientProductId)
    if (!(Number(item.qty) > 0)) {
      return `${position}: qty harus lebih dari 0.`
    }
    if (!item.uomId) {
      return `${position}: UOM wajib dipilih.`
    }
    const loss = Number(item.lossPercentage) || 0
    if (loss < 0 || loss > 100) {
      return `${position}: loss % harus di antara 0 dan 100.`
    }
  }
  return null
}

async function onSubmit(): Promise<void> {
  if (isReadOnly.value) {
    return
  }
  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    return
  }
  formError.value = null
  submitting.value = true
  try {
    const payload: SaveRecipePayload = {
      name: name.value.trim(),
      productId: productId.value,
      yieldQty: Number(yieldQty.value) || 0,
      yieldUomId: yieldUomId.value,
      instructions: instructions.value.trim() || undefined,
      items: items.value.map((item) => ({
        ingredientProductId: item.ingredientProductId,
        qty: Number(item.qty) || 0,
        uomId: item.uomId,
        lossPercentage: Number(item.lossPercentage) || 0,
      })),
    }
    const saved = editId.value
      ? await recipeService.update(editId.value, payload)
      : await recipeService.create(payload)
    void router.push({ name: 'ProductionRecipeDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'ProductionRecipes' })
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
          v-if="isReadOnly"
          class="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        >
          Resep ini tidak dapat diedit pada status saat ini. Untuk versi baru,
          arsipkan resep lalu buat resep baru. Ditampilkan sebagai baca-saja.
        </p>

        <!-- Header -->
        <RecipeHeaderFields
          v-model:name="name"
          v-model:product-id="productId"
          v-model:yield-qty="yieldQty"
          v-model:yield-uom-id="yieldUomId"
          v-model:instructions="instructions"
          :uoms="uoms"
          :product-label="productSelectedLabel"
          :product-results="productResults"
          :product-searching="productSearching"
          :blocked-product-ids="blockedProductIds"
          :disabled="isReadOnly"
          @product-search="onProductSearch"
          @product-select="onProductSelect"
          @product-clear="onProductClear"
        />

        <!-- Ingredient items -->
        <div>
          <h5 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Bahan</h5>
          <RecipeItemsEditor
            v-model="items"
            :products="products"
            :uoms="uoms"
            :disabled="isReadOnly"
          />
        </div>

        <p
          v-if="formError"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ formError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <Button size="sm" variant="outline" :disabled="submitting" :on-click="onCancel">
            {{ isReadOnly ? 'Kembali' : 'Batal' }}
          </Button>
          <button
            v-if="!isReadOnly"
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan sebagai Draft' }}
          </button>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
