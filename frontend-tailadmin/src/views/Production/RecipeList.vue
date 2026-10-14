<script setup lang="ts">
/**
 * RecipeList — thin controller for the Recipes (BOM) list page. List state
 * (pagination/search/status + product filter) lives in `useRecipes`; the
 * toolbar and table are separate feature components. Product names come from
 * recipe records, so product.read is not needed to view recipes.
 * "Buat" and row "detail" navigate to dedicated full pages (the form is a page,
 * not a modal).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2 } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import { RecipeFilterBar, RecipeTable } from '@/components/production/recipe'
import { usePermission } from '@/composables/usePermission'
import { useRecipes } from '@/composables/useRecipes'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { recipeService, type Recipe } from '@/services/recipe.service'

const pageTitle = 'Recipe'
const route = useRoute()
const router = useRouter()
const { can } = usePermission()
const canManage = computed<boolean>(() => can('recipe.manage'))

// Success feedback after a draft recipe was deleted on the detail page
// (redirected here with ?deleted=1). Dismissible; cleared from the URL on mount.
const deletedNotice = ref<boolean>(false)

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

// Derive filter options from recipes the user can already read.
const productOptions = ref<{ id: string; label: string }[]>([])

async function loadLookups(): Promise<void> {
  try {
    const allRecipes = await fetchAllPaginated((page) =>
      recipeService.list({ page, limit: PAGE_LIMIT }),
    )
    const productsById = new Map<string, string>()
    for (const recipe of allRecipes) {
      if (recipe.productName) {
        productsById.set(recipe.productId, recipe.productName)
      }
    }
    productOptions.value = [...productsById]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    // Non-fatal: recipe rows still carry their product names.
    productOptions.value = []
  }
}

function goToCreate(): void {
  void router.push({ name: 'ProductionRecipeCreate' })
}

function goToDetail(recipe: Recipe): void {
  void router.push({ name: 'ProductionRecipeDetail', params: { id: recipe.id } })
}

function dismissDeletedNotice(): void {
  deletedNotice.value = false
}

onMounted(() => {
  if (route.query.deleted === '1') {
    deletedNotice.value = true
    // Strip the flag so a refresh/back doesn't re-show the banner.
    void router.replace({ name: 'ProductionRecipes' })
  }
  void loadLookups()
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <div
      v-if="deletedNotice"
      class="mb-4 flex items-start justify-between gap-3 rounded-lg border border-success-500/40 bg-success-50 px-4 py-3 text-sm text-success-600 dark:bg-success-500/10 dark:text-success-500"
      role="status"
    >
      <span class="flex items-center gap-2">
        <CheckCircle2 class="h-4 w-4 shrink-0" aria-hidden="true" />
        Resep draft berhasil dihapus.
      </span>
      <button
        type="button"
        class="text-success-600 underline-offset-2 hover:underline dark:text-success-500"
        @click="dismissDeletedNotice"
      >
        Tutup
      </button>
    </div>

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
