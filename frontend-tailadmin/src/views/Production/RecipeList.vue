<script setup lang="ts">
/**
 * RecipeList — thin controller for the Recipes (BOM) list page. List state
 * (pagination/search/status + product filter) lives in `useRecipes`; the
 * toolbar and table are separate feature components. Finished product names are
 * resolved from a one-time lookup (products are fetched once via fetchAll).
 * "Buat" and row "detail" navigate to dedicated full pages (the form is a page,
 * not a modal).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import { RecipeFilterBar, RecipeTable } from '@/components/production/recipe'
import { usePermission } from '@/composables/usePermission'
import { useRecipes } from '@/composables/useRecipes'
import { productService, type Product } from '@/services/product.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { Recipe } from '@/services/recipe.service'

const pageTitle = 'Recipe'
const router = useRouter()
const { can } = usePermission()
const canManage = computed<boolean>(() => can('recipe.manage'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  productFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useRecipes()

// Resolve finished product names from a one-time lookup.
const productOptions = ref<{ id: string; label: string }[]>([])
const productNames = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const allProducts = await fetchAllPaginated<Product>((page) =>
      productService.list({ page, limit: PAGE_LIMIT }),
    )
    productOptions.value = allProducts
      .map((p) => ({ id: p.id, label: `${p.name} (${p.sku})` }))
      .sort((a, b) => a.label.localeCompare(b.label))
    productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
  } catch {
    // Non-fatal: fall back to showing raw ids in the table.
    productOptions.value = []
    productNames.value = new Map()
  }
}

function productName(id: string): string {
  return productNames.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'ProductionRecipeCreate' })
}

function goToDetail(recipe: Recipe): void {
  void router.push({ name: 'ProductionRecipeDetail', params: { id: recipe.id } })
}

onMounted(() => {
  void loadLookups()
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Recipe"
      desc="Kelola resep produksi (Bill of Materials) berversi: susun bahan, aktifkan, atau arsipkan."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <RecipeFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:product="productFilter"
          :products="productOptions"
        />
        <Button v-if="canManage" size="sm" variant="primary" :on-click="goToCreate">
          + Buat Resep
        </Button>
      </div>

      <RecipeTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :product-name="productName"
        @view="goToDetail"
      />

      <!-- Pagination -->
      <div
        v-if="!loading && !errorMessage && items.length > 0"
        class="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row"
      >
        <span class="text-theme-sm text-gray-500 dark:text-gray-400">
          Menampilkan {{ items.length }} dari {{ meta.total }} data
        </span>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" :disabled="!canPrev" :on-click="prevPage">
            Sebelumnya
          </Button>
          <span class="text-theme-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ totalPages }}
          </span>
          <Button size="sm" variant="outline" :disabled="!canNext" :on-click="nextPage">
            Berikutnya
          </Button>
        </div>
      </div>
    </ComponentCard>
  </AdminLayout>
</template>
